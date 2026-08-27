import fs from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { GoogleGenAI } from '@google/genai'
import { WorkspaceManager } from './workspace.js'
import { logger } from '../config/logger.js'
import { getGcloudProjectId } from './gcloud.js'
import { config } from '../config/index.js'
import { decodeImageDataUrl, safeFetchImage } from './safe-fetch.js'

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'

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

function mapAspectRatioToShortApiSize(ratio?: string): string {
  if (!ratio) return '1024x1024'
  if (ratio === '1:1') return '1024x1024'
  if (ratio === '9:16' || ratio === '3:4') return '1024x1536'
  if (ratio === '16:9' || ratio === '4:3') return '1536x1024'
  return '1024x1024'
}

async function executeShortApiGenerate(
  prompt: string,
  aspectRatio: string | undefined,
  threadId: string,
  inputImageUrl?: string
): Promise<{ imageUrl: string; modelUsed: string }> {
  const apiKey = config.shortapiApiKey
  if (!apiKey) {
    throw new Error('SHORTAPI_API_KEY is not configured.')
  }

  const size = mapAspectRatioToShortApiSize(aspectRatio)

  // 根据是否提供输入图片决定使用 text-to-image 还是 edit 模型
  const isImg2Img = !!inputImageUrl
  const modelPath = isImg2Img
    ? 'openai/gpt-image-2/edit'
    : 'openai/gpt-image-2/text-to-image'

  const args: Record<string, unknown> = {
    prompt,
    size,
  }

  // 图生图模式：将输入图片作为编辑源传入
  if (isImg2Img && inputImageUrl) {
    args.image = inputImageUrl
  }

  // 1. Create Job
  const createRes = await fetch('https://api.shortapi.ai/api/v1/job/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: modelPath, args }),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(
      `ShortAPI job creation failed: ${createRes.status} - ${errText}`
    )
  }

  const createData = (await createRes.json()) as any
  const jobId = createData.data?.job_id
  if (!jobId) {
    throw new Error('ShortAPI did not return a job_id.')
  }

  // 2. Poll Status
  const queryUrl = `https://api.shortapi.ai/api/v1/job/query?id=${jobId}`
  let attempts = 0
  // 复杂 prompt（如封面图）生成耗时较长，90s 常超时；提到 180s（90 次 × 2s）
  const maxAttempts = 90

  while (attempts < maxAttempts) {
    attempts++
    await new Promise(resolve => setTimeout(resolve, 2000))

    const queryRes = await fetch(queryUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!queryRes.ok) {
      logger.warn(
        `ShortAPI query attempt ${attempts} failed: ${queryRes.status}`
      )
      continue
    }

    const queryData = (await queryRes.json()) as any
    const dataBlock = queryData.data || {}
    const status = dataBlock.status

    if (status === 2) {
      const images = dataBlock.result?.images
      if (images?.length && images[0].url) {
        const imgUrl = images[0].url
        const { base64Data, mimeType } = await fetchImageAsBase64(imgUrl)
        const imageUrl = await uploadToCDN(base64Data, mimeType, threadId)
        return {
          imageUrl,
          modelUsed: isImg2Img
            ? 'openai/gpt-image-2/edit'
            : 'openai/gpt-image-2',
        }
      }
      throw new Error('No images found in successful ShortAPI result.')
    }

    if (status !== 1) {
      throw new Error(`ShortAPI job failed with status: ${status}`)
    }
  }

  throw new Error('ShortAPI image generation timed out after 180 seconds.')
}

async function executeGeminiApiGenerate(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  referenceImageUrls?: string[],
  inputImageUrl?: string
): Promise<string> {
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
    },
  })

  const imagePart = response.candidates?.[0]?.content?.parts?.find(p =>
    p.inlineData?.mimeType?.startsWith('image/')
  )

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data returned from Gemini API.')
  }

  return imagePart.inlineData.data
}

async function executeVertexAiGenerate(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  aspectRatio?: string,
  negativePrompt?: string
): Promise<string> {
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

  return imagePart.image.imageBytes
}

interface GenerateImageInput {
  prompt: string
  style_preset?: string
  aspect_ratio?: string
  reference_image_urls?: string[]
  negative_prompt?: string
  model?: 'gemini' | 'gpt-image-2'
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

export async function executeGenerateImage(
  input: GenerateImageInput,
  threadId: string
): Promise<GenerateImageOutput> {
  const startTime = Date.now()
  const reqModel = input.model

  // 1. If user explicitly requested gpt-image-2
  if (reqModel === 'gpt-image-2') {
    try {
      const { prompt: enhancedPrompt } = enhancePrompt(
        input.prompt,
        input.style_preset || 'photo_realistic',
        input.negative_prompt
      )
      const { imageUrl, modelUsed } = await executeShortApiGenerate(
        enhancedPrompt,
        input.aspect_ratio,
        threadId,
        input.input_image_url
      )
      return {
        success: true,
        image_url: imageUrl,
        metadata: {
          model: modelUsed,
          prompt_used: enhancedPrompt,
          aspect_ratio: input.aspect_ratio || '1:1',
          latency_ms: Date.now() - startTime,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        error: `ShortAPI generation failed: ${err.message}`,
        metadata: {
          model: 'openai/gpt-image-2',
          prompt_used: input.prompt,
          aspect_ratio: input.aspect_ratio || '1:1',
          latency_ms: Date.now() - startTime,
        },
      }
    }
  }

  // 2. Default Strategy: "Prefer Gemini, Fallback GPT-Image-2"
  const errors: string[] = []

  const { prompt: enhancedPrompt, negativePrompt } = enhancePrompt(
    input.prompt,
    input.style_preset || 'photo_realistic',
    input.negative_prompt
  )

  // Try 1: Gemini API Mode (via GEMINI_API_KEY)
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (geminiApiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: geminiApiKey })
      const base64Data = await executeGeminiApiGenerate(
        client,
        MODEL,
        enhancedPrompt,
        input.reference_image_urls,
        input.input_image_url
      )
      const imageUrl = await uploadToCDN(base64Data, 'image/png', threadId)
      return {
        success: true,
        image_url: imageUrl,
        metadata: {
          model: MODEL,
          prompt_used: enhancedPrompt,
          aspect_ratio: input.aspect_ratio || '1:1',
          latency_ms: Date.now() - startTime,
        },
      }
    } catch (err: any) {
      errors.push(`Gemini API error: ${err.message}`)
    }
  } else {
    errors.push('Gemini API skipped: GEMINI_API_KEY not configured.')
  }

  // Try 2: Vertex AI Mode (via local ADC)
  try {
    const projectId = await getGcloudProjectId()
    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: config.gcloudLocation || 'us-central1',
    })
    const vertexModel =
      process.env.VERTEX_IMAGE_MODEL || 'imagen-3.0-generate-002'
    const base64Data = await executeVertexAiGenerate(
      client,
      vertexModel,
      enhancedPrompt,
      input.aspect_ratio,
      negativePrompt
    )
    const imageUrl = await uploadToCDN(base64Data, 'image/jpeg', threadId)
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
    errors.push(`Vertex AI error: ${err.message}`)
  }

  // Try 3: ShortAPI Fallback Mode (GPT Image 2)
  if (config.shortapiApiKey) {
    try {
      const { imageUrl, modelUsed } = await executeShortApiGenerate(
        enhancedPrompt,
        input.aspect_ratio,
        threadId,
        input.input_image_url
      )
      return {
        success: true,
        image_url: imageUrl,
        metadata: {
          model: modelUsed,
          prompt_used: enhancedPrompt,
          aspect_ratio: input.aspect_ratio || '1:1',
          latency_ms: Date.now() - startTime,
        },
      }
    } catch (err: any) {
      errors.push(`ShortAPI error: ${err.message}`)
    }
  } else {
    errors.push('ShortAPI skipped: SHORTAPI_API_KEY not configured.')
  }

  // If all failed
  return {
    success: false,
    error: `All image generation channels failed. Errors: [${errors.join('; ')}]`,
    metadata: {
      model: 'unknown',
      prompt_used: enhancedPrompt,
      aspect_ratio: input.aspect_ratio || '1:1',
      latency_ms: Date.now() - startTime,
    },
  }
}
