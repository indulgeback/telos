import dotenv from 'dotenv'
import { logger } from './logger.js'

// 加载环境变量
dotenv.config()

// ========== 配置导出 ==========
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || '',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || '',
  defaultModel: process.env.DEFAULT_AGENT_MODEL || 'deepseek-v4-flash',

  // Legacy OpenAI-compatible providers kept only so unused legacy modules compile.
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl:
    process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  seedApiKey: process.env.SEED_API_KEY || '',
  seedBaseUrl:
    process.env.SEED_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  bailianApiKey: process.env.BAILIAN_API_KEY || '',
  bailianBaseUrl:
    process.env.BAILIAN_BASE_URL ||
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  shortapiApiKey:
    process.env.SHORTAPI_API_KEY || process.env.SHORTAPI_KEY || '',
  shortapiBaseUrl:
    process.env.SHORTAPI_BASE_URL || 'https://api.shortapi.ai/v1',

  // Google Cloud Vertex AI OpenAI-compatible endpoint.
  gcloudProjectId:
    process.env.GCLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    '',
  gcloudLocation:
    process.env.GCLOUD_LOCATION ||
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEX_AI_LOCATION ||
    'global',
  gcloudAccessToken:
    process.env.GCLOUD_ACCESS_TOKEN ||
    process.env.GOOGLE_OAUTH_ACCESS_TOKEN ||
    '',

  // VolcEngine Doubao realtime speech
  volcRealtimeEndpoint:
    process.env.VOLC_REALTIME_ENDPOINT ||
    'wss://openspeech.bytedance.com/api/v3/realtime/dialogue',
  volcRealtimeAppId: process.env.VOLC_REALTIME_APP_ID || '',
  volcRealtimeAccessKey: process.env.VOLC_REALTIME_ACCESS_KEY || '',
  volcRealtimeResourceId:
    process.env.VOLC_REALTIME_RESOURCE_ID || 'volc.speech.dialog',
  volcRealtimeAppKey: process.env.VOLC_REALTIME_APP_KEY || 'PlgvMymc7f3tQnJ6',
  volcRealtimeModel: process.env.VOLC_REALTIME_MODEL || '1.2.1.1',
  volcRealtimeSpeaker: process.env.VOLC_REALTIME_SPEAKER || '',
  volcRealtimeDemo: process.env.VOLC_REALTIME_DEMO === 'true',

  // 服务
  port: parseInt(process.env.PORT || '8895', 10),
  serviceName: process.env.SERVICE_NAME || 'agent-service',
  serviceAddress: process.env.SERVICE_ADDRESS || '', // 服务注册地址

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',

  // Gateway identity
  gatewayInternalSecret:
    process.env.GATEWAY_INTERNAL_SECRET ||
    'dev-gateway-internal-secret-change-me',
  authClockSkewSeconds: parseInt(
    process.env.AUTH_CLOCK_SKEW_SECONDS || '300',
    10
  ),
  allowAnonymousOwner: process.env.ALLOW_ANONYMOUS_OWNER === 'true',
} as const

// ========== 验证配置 ==========
export function validateConfig(): void {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  if (!config.openaiApiKey) {
    logger.warn({
      msg: 'OPENAI_API_KEY is not configured. OpenAI tracing export is disabled, but DeepSeek/Seed/Bailian/Google Cloud/ShortAPI agent runs can still work when their provider credentials are configured.',
    })
  }
}

// ========== 导出 Pino Logger ==========
export { logger, createModuleLogger } from './logger.js'
