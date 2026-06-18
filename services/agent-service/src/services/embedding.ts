import OpenAI from 'openai'
import { config } from '../config/index.js'
import { logger } from '../config/logger.js'
import { getGcloudAccessToken, getGcloudProjectId } from './gcloud.js'

// 初始化 OpenAI 客户端，用于生成 Embedding
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient

  const apiKey = config.openaiApiKey || config.shortapiApiKey
  const baseURL = config.openaiApiKey ? (config.openaiBaseUrl || undefined) : (config.shortapiBaseUrl || undefined)

  if (!apiKey) {
    logger.warn('Embedding: Neither OPENAI_API_KEY nor SHORTAPI_API_KEY is configured.')
  }

  openaiClient = new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL,
  })

  return openaiClient
}

/**
 * 生成 1536 维的向量表示
 * 根据配置使用 text-embedding-3-small (OpenAI) 或 text-embedding-004 (Google Cloud Vertex AI)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (text.includes('TRIGGER_FALLBACK')) {
    throw new Error('Simulated Embedding Service Failure for testing')
  }

  if (!text || text.trim() === '') {
    return new Array(1536).fill(0)
  }

  const provider = config.embeddingProvider || 'openai'

  if (provider === 'gcloud') {
    try {
      const token = getGcloudAccessToken()
      const projectId = getGcloudProjectId()
      const location = config.gcloudLocation && config.gcloudLocation !== 'global' ? config.gcloudLocation : 'us-central1'
      const model = config.embeddingModel || 'text-embedding-004'

      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`

      // 本地开发环境代理支持
      const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
      let dispatcher: any = undefined
      if (proxyUrl) {
        const { ProxyAgent } = await import('undici')
        dispatcher = new ProxyAgent(proxyUrl)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ content: text }],
          parameters: {
            outputDimensionality: 768, // text-embedding-004 最大支持 768 维
          },
        }),
        ...(dispatcher ? { dispatcher } : {}),
      } as any)

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Vertex AI predict request failed: ${response.status} ${response.statusText} - ${errText}`)
      }

      const data = (await response.json()) as any
      let embedding = data.predictions?.[0]?.embeddings?.values

      if (Array.isArray(embedding)) {
        // 余弦距离数学对齐：补 0 填充到 1536 维以适配数据库 vector(1536) 约束
        if (embedding.length < 1536) {
          const padding = new Array(1536 - embedding.length).fill(0)
          embedding = embedding.concat(padding)
        }
        return embedding
      }
      throw new Error('No embedding returned from Vertex AI API')
    } catch (error) {
      logger.error({ msg: '\x1b[1;33mFailed to generate Google Cloud embedding\x1b[0m', error, text })
      throw error
    }
  }

  // 默认使用 OpenAI
  try {
    const client = getOpenAIClient()
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float' as const,
    })

    if (response.data?.[0]?.embedding) {
      return response.data[0].embedding
    }
    throw new Error('No embedding returned from API')
  } catch (error) {
    logger.error({ msg: '\x1b[1;33mFailed to generate OpenAI embedding\x1b[0m', error, text })
    throw error
  }
}


