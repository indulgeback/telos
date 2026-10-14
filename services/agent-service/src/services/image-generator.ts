import fs from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { GoogleGenAI } from '@google/genai'
import { WorkspaceManager } from './workspace.js'
import { logger } from '../config/logger.js'
import { getGcloudProjectId } from './gcloud.js'
import { config } from '../config/index.js'
import { decodeImageDataUrl, safeFetchImage } from './safe-fetch.js'

const DEFAULT_VERTEX_IMAGE_MODEL = 'gemini-2.5-flash-image'

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
  return /^gemini-.+-image(?:-preview)?$/.test(model)
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

  const { prompt: enhancedPrompt, negativePrompt } = enhancePrompt(
    input.prompt,
    input.style_preset || 'photo_realistic',
    input.negative_prompt
  )

  // Vertex AI (via local ADC) —— 当前唯一启用的生图通道。
  // Gemini 开发者 API 因预付费余额耗尽移除(402);ShortAPI 因服务器
  // 无法直连 api.shortapi.ai 移除。恢复任一通道时参考 git 历史。
  try {
    const projectId = await getGcloudProjectId()
    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: config.gcloudLocation || 'us-central1',
    })
    const vertexModel =
      process.env.VERTEX_IMAGE_MODEL || DEFAULT_VERTEX_IMAGE_MODEL
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
    return {
      success: true,
      image_url: imageUrl,
      metadata: {
        model: vertexModel,
        prompt_used: enhancedPrompt,
        aspect_ratio: input.aspect_ratio || '1:1',
        latency_ms: Date.now() - startTime,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Vertex AI generation failed: ${describeProviderError(err)}`,
      metadata: {
        model: process.env.VERTEX_IMAGE_MODEL || DEFAULT_VERTEX_IMAGE_MODEL,
        prompt_used: enhancedPrompt,
        aspect_ratio: input.aspect_ratio || '1:1',
        latency_ms: Date.now() - startTime,
      },
    }
  }
}
