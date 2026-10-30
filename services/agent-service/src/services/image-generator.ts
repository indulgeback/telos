import fs from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { GoogleGenAI } from '@google/genai'
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici'
import { WorkspaceManager } from './workspace.js'
import { logger } from '../config/logger.js'
import { getGcloudProjectId } from './gcloud.js'
import { config } from '../config/index.js'
import { decodeImageDataUrl, safeFetchImage } from './safe-fetch.js'
import { prisma } from './db.js'


// ============ 国内 fallback 生图通道（火山 Seedream / 百炼通义万相）============

const ARK_IMAGE_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const WANX_TASK_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks'
const WANX_SUBMIT_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis'

/** Seedream 的 size 参数映射（宽x高，512-4096 任意比例） */
export function mapArkSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case '9:16':
      return '1152x2048'
    case '16:9':
      return '2048x1152'
    case '4:3':
      return '2048x1536'
    case '3:4':
      return '1536x2048'
    default:
      return '2048x2048'
  }
}

/** 通义万相的 size 参数映射（宽*高） */
export function mapWanxSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case '9:16':
      return '720*1280'
    case '16:9':
      return '1280*720'
    case '4:3':
      return '1024*768'
    case '3:4':
      return '768*1024'
    default:
      return '1024*1024'
  }
}

async function generateViaArk(options: {
  model: string
  prompt: string
  aspectRatio?: string
  inputImageUrl?: string
  referenceImageUrls?: string[]
}): Promise<string> {
  if (!config.seedApiKey) {
    throw new Error('SEED_API_KEY is not configured')
  }
  const image = [
    ...(options.inputImageUrl ? [options.inputImageUrl] : []),
    ...(options.referenceImageUrls ?? []),
  ]
  const response = await undiciFetch(
    `${ARK_IMAGE_BASE_URL}/images/generations`,
    {
      // 国内端点显式直连：容器全局 dispatcher 走 mihomo 代理，抖动时会连坐国内 API
      dispatcher: new UndiciAgent(),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.seedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        prompt: options.prompt,
        response_format: 'url',
        size: mapArkSize(options.aspectRatio),
        watermark: false,
        ...(image.length > 0 ? { image } : {}),
      }),
    }
  )
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
  }
  const data = (await response.json()) as {
    data?: Array<{ url?: string }>
  }
  const url = data.data?.[0]?.url
  if (!url) throw new Error('Ark response missing image url')
  return url
}

async function generateViaWanx(options: {
  model: string
  prompt: string
  aspectRatio?: string
}): Promise<string> {
  if (!config.bailianApiKey) {
    throw new Error('BAILIAN_API_KEY is not configured')
  }
  const submit = await undiciFetch(WANX_SUBMIT_URL, {
    // 国内端点显式直连（同上）
    dispatcher: new UndiciAgent(),
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.bailianApiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: options.model,
      input: { prompt: options.prompt },
      parameters: { size: mapWanxSize(options.aspectRatio), n: 1 },
    }),
  })
  if (!submit.ok) {
    const text = await submit.text().catch(() => '')
    throw new Error(`HTTP ${submit.status}: ${text.slice(0, 200)}`)
  }
  const submitData = (await submit.json()) as {
    output?: { task_id?: string }
  }
  const taskId = submitData.output?.task_id
  if (!taskId) throw new Error('Wanx submit missing task id')

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    const poll = await undiciFetch(`${WANX_TASK_BASE_URL}/${taskId}`, {
      dispatcher: new UndiciAgent(),
      headers: { Authorization: `Bearer ${config.bailianApiKey}` },
    })
    if (!poll.ok) continue
    const data = (await poll.json()) as {
      output?: {
        task_status?: string
        results?: Array<{ url?: string }>
      }
    }
    const status = data.output?.task_status
    if (status === 'SUCCEEDED') {
      const url = data.output?.results?.[0]?.url
      if (!url) throw new Error('Wanx task succeeded without image url')
      return url
    }
    if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`Wanx task ${status}`)
    }
  }
  throw new Error('Wanx task polling timed out')
}

/** 把 fallback 通道返回的临时 URL 转成本地 base64（随后统一转存自有 COS） */
async function importRemoteImage(url: string): Promise<{
  base64Data: string
  mimeType: string
}> {
  const fetched = await safeFetchImage(url, { maxBytes: 15 * 1024 * 1024 })
  const base64Data = Buffer.from(fetched.bytes).toString('base64')
  return { base64Data, mimeType: fetched.mimeType }
}


const DEFAULT_VERTEX_IMAGE_MODEL = 'gemini-nano-banana-2.1'

const STYLE_SUFFIX_MAP: Record<string, string> = {
  photo_realistic:
    'photorealistic, high-quality fashion photography, soft natural lighting, editorial style',
  illustration:
    'digital illustration, clean lines, fashion sketch aesthetic, vibrant colors',
  vibe_card:
    'aesthetic mood board, dreamy soft colors, Gen Z aesthetic, Pinterest-worthy, ethereal',
  moodboard:
    'collage style, layered textures, color palette chips, minimalist typography',
  sketch:
    'fashion design sketch, pencil and ink, clean white background, detailed garment lines',
}

export function enhancePrompt(
  rawPrompt: string,
  stylePreset: string,
  negativePrompt?: string
): { prompt: string; negativePrompt: string } {
  const styleSuffix =
    STYLE_SUFFIX_MAP[stylePreset] || STYLE_SUFFIX_MAP.photo_realistic
  const enhancedPrompt = `${rawPrompt}, ${styleSuffix}`

  const baseNegative =
    'ugly, distorted, blurry, watermark, text overlay, duplicate, low quality, nsfw'
  const finalNegative = negativePrompt
    ? `${baseNegative}, ${negativePrompt}`
    : baseNegative

  return { prompt: enhancedPrompt, negativePrompt: finalNegative }
}

async function fetchImageAsBase64(
  url: string
): Promise<{ base64Data: string; mimeType: string }> {
  const image = url.trim().toLowerCase().startsWith('data:')
    ? decodeImageDataUrl(url)
    : await safeFetchImage(url)
  return {
    base64Data: Buffer.from(image.bytes).toString('base64'),
    mimeType: image.mimeType,
  }
}

async function uploadToCDN(
  base64Data: string,
  mimeType: string,
  threadId: string
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'
  const fileName = `generated_image_${uuidv4()}.${ext}`

  const localDir = WorkspaceManager.getWorkspacePath(threadId)
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true })
  }
  const localFilePath = path.join(localDir, fileName)

  fs.writeFileSync(localFilePath, Buffer.from(base64Data, 'base64'))

  // 同步直传到云端/COS
  await WorkspaceManager.syncFileToCloud(threadId, fileName)

  // 获取直链
  return WorkspaceManager.getFileUrl(threadId, fileName)
}

export function isGeminiImageModel(model: string): boolean {
  // Gemini 系对话式生图模型：经典 *-image 命名 + Nano Banana 系（nano-banana-2.1 等）
  return /^(?:gemini-.+-image(?:-preview)?|gemini-nano-banana-\d+(?:\.\d+)?)$/.test(
    model
  )
}

// Nano Banana 系列只在 Vertex 的 global region 上架（区域端点 404），
// 选择 Vertex 请求 location 时据此分流。
export function isNanoBananaModel(model: string): boolean {
  return /^gemini-nano-banana-\d+(?:\.\d+)?$/.test(model)
}

export async function executeGeminiApiGenerate(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  aspectRatio?: string,
  referenceImageUrls?: string[],
  inputImageUrl?: string
): Promise<{ base64Data: string; mimeType: string }> {
  const contentParts: any[] = []

  // 图生图模式：输入图片作为首要编辑对象放在 prompt 之前
  if (inputImageUrl) {
    const { base64Data: inputBase64, mimeType: inputMimeType } =
      await fetchImageAsBase64(inputImageUrl)
    contentParts.push({
      inlineData: {
        mimeType: inputMimeType,
        data: inputBase64,
      },
    })
    contentParts.push({
      text: `Edit or transform this image based on the following instructions: ${prompt}`,
    })
  } else {
    contentParts.push({ text: prompt })
  }

  // 风格参考图（无论文生图还是图生图均可附加）
  if (referenceImageUrls?.length) {
    for (const url of referenceImageUrls.slice(0, 4)) {
      const { base64Data, mimeType } = await fetchImageAsBase64(url)
      contentParts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      })
    }
    // 找到 text part 并追加风格参考提示
    const textPart = contentParts.find(p => p.text)
    if (textPart) {
      textPart.text += ' Use the provided reference images for style guidance.'
    }
  }

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: contentParts }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
      ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
    },
  })

  const imagePart = response.candidates?.[0]?.content?.parts?.find(p =>
    p.inlineData?.mimeType?.startsWith('image/')
  )

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data returned from Gemini API.')
  }

  return {
    base64Data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  }
}

export async function executeVertexAiGenerate(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  aspectRatio?: string,
  negativePrompt?: string,
  referenceImageUrls?: string[],
  inputImageUrl?: string
): Promise<{ base64Data: string; mimeType: string }> {
  if (isGeminiImageModel(model)) {
    return executeGeminiApiGenerate(
      client,
      model,
      prompt,
      aspectRatio,
      referenceImageUrls,
      inputImageUrl
    )
  }

  const response = await client.models.generateImages({
    model,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: (aspectRatio || '1:1') as any,
      negativePrompt,
      outputMimeType: 'image/jpeg',
    },
  })

  const imagePart = response.generatedImages?.[0]
  if (!imagePart?.image?.imageBytes) {
    throw new Error('No image data returned from Vertex AI.')
  }

  return { base64Data: imagePart.image.imageBytes, mimeType: 'image/jpeg' }
}

interface GenerateImageInput {
  prompt: string
  style_preset?: string
  aspect_ratio?: string
  reference_image_urls?: string[]
  negative_prompt?: string
  /** 图生图模式：提供输入图片 URL，模型将基于此图 + prompt 生成变换后的新图 */
  input_image_url?: string
}

interface GenerateImageOutput {
  success: boolean
  image_url?: string
  error?: string
  metadata: {
    model: string
    prompt_used: string
    aspect_ratio: string
    latency_ms: number
  }
}

function describeProviderError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause
  if (cause instanceof Error && cause.message) {
    return `${error.message}; cause: ${cause.message}`
  }
  if (cause && typeof cause === 'object' && 'code' in cause) {
    return `${error.message}; cause code: ${String((cause as { code: unknown }).code)}`
  }
  return error.message
}

export async function executeGenerateImage(
  input: GenerateImageInput,
  threadId: string
): Promise<GenerateImageOutput> {
  const startTime = Date.now()
  const fallbackErrors: string[] = []

  const { prompt: enhancedPrompt, negativePrompt } = enhancePrompt(
    input.prompt,
    input.style_preset || 'photo_realistic',
    input.negative_prompt
  )

  const finish = async (imageUrl: string, model: string) => {
    // 图片画布：生成成功即登记到线程的 images 清单（结构化，画布直接读）
    try {
      await prisma.$executeRaw`UPDATE agent_threads
        SET images = COALESCE(images, '[]'::jsonb) || ${JSON.stringify([
          { url: imageUrl, createdAt: new Date().toISOString() },
        ])}::jsonb
        WHERE id = ${threadId}`
    } catch (persistError) {
      logger.warn({
        msg: 'Failed to persist generated image to thread canvas',
        threadId,
        err: persistError,
      })
    }
    return {
      success: true,
      image_url: imageUrl,
      metadata: {
        model,
        prompt_used: enhancedPrompt,
        aspect_ratio: input.aspect_ratio || '1:1',
        latency_ms: Date.now() - startTime,
      },
    }
  }

  // ===== 通道 1（主）：Vertex AI (via local ADC) =====
  try {
    const vertexModel =
      process.env.VERTEX_IMAGE_MODEL || DEFAULT_VERTEX_IMAGE_MODEL
    // Nano Banana 系列仅在 Vertex 的 global region 提供，其他模型仍走
    // 区域端点（us-central1），global 区域模型在区域端点上会 404。
    const location = isNanoBananaModel(vertexModel)
      ? 'global'
      : config.gcloudLocation || 'us-central1'
    const projectId = await getGcloudProjectId()
    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location,
    })
    const generated = await executeVertexAiGenerate(
      client,
      vertexModel,
      enhancedPrompt,
      input.aspect_ratio,
      negativePrompt,
      input.reference_image_urls,
      input.input_image_url
    )
    const imageUrl = await uploadToCDN(
      generated.base64Data,
      generated.mimeType,
      threadId
    )
    return finish(imageUrl, vertexModel)
  } catch (err: any) {
    logger.warn({
      msg: 'Vertex image generation failed, trying fallback channels',
      threadId,
      err: err instanceof Error ? err.message : String(err),
    })
    fallbackErrors.push(`Vertex: ${describeProviderError(err)}`)
  }

  // ===== 通道 2（fallback）：火山 Seedream（同步 API，支持参考图/图生图）=====
  try {
    const remote = await generateViaArk({
      model: config.arkImageModel,
      prompt: enhancedPrompt,
      aspectRatio: input.aspect_ratio,
      inputImageUrl: input.input_image_url,
      referenceImageUrls: input.reference_image_urls,
    })
    const imported = await importRemoteImage(remote)
    const imageUrl = await uploadToCDN(
      imported.base64Data,
      imported.mimeType,
      threadId
    )
    logger.info({
      msg: 'Image generated via Ark fallback channel',
      threadId,
      model: config.arkImageModel,
    })
    return finish(imageUrl, config.arkImageModel)
  } catch (err: any) {
    logger.warn({
      msg: 'Ark image generation failed',
      threadId,
      err: err instanceof Error ? err.message : String(err),
    })
    fallbackErrors.push(`Ark(${config.arkImageModel}): ${err instanceof Error ? err.message : String(err)}`)
  }

  // ===== 通道 3（fallback）：百炼通义万相（异步任务，仅纯文生图）=====
  if (!input.input_image_url) {
    try {
      const remote = await generateViaWanx({
        model: config.wanxImageModel,
        prompt: enhancedPrompt,
        aspectRatio: input.aspect_ratio,
      })
      const imported = await importRemoteImage(remote)
      const imageUrl = await uploadToCDN(
        imported.base64Data,
        imported.mimeType,
        threadId
      )
      logger.info({
        msg: 'Image generated via Wanx fallback channel',
        threadId,
        model: config.wanxImageModel,
      })
      return finish(imageUrl, config.wanxImageModel)
    } catch (err: any) {
      logger.warn({
        msg: 'Wanx image generation failed',
        threadId,
        err: err instanceof Error ? err.message : String(err),
      })
      fallbackErrors.push(`Wanx(${config.wanxImageModel}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    success: false,
    error: `所有生图通道均失败 —— ${fallbackErrors.join('；')}`,
    metadata: {
      model: process.env.VERTEX_IMAGE_MODEL || DEFAULT_VERTEX_IMAGE_MODEL,
      prompt_used: enhancedPrompt,
      aspect_ratio: input.aspect_ratio || '1:1',
      latency_ms: Date.now() - startTime,
    },
  }
}
