import dotenv from 'dotenv'
import { logger } from './logger.js'

// 加载环境变量
dotenv.config()

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = Number.parseInt(raw || '', 10)
  if (!Number.isSafeInteger(parsed)) return fallback
  return Math.max(minimum, Math.min(parsed, maximum))
}

const authClockSkewSeconds = boundedInteger(
  process.env.AUTH_CLOCK_SKEW_SECONDS,
  300,
  1,
  900
)
const gatewayNonceTtlSeconds = Math.max(
  authClockSkewSeconds * 2,
  boundedInteger(process.env.GATEWAY_NONCE_TTL_SECONDS, 600, 30, 3600)
)

// ========== 配置导出 ==========
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  agentRunWorkerConcurrency: boundedInteger(
    process.env.AGENT_RUN_WORKER_CONCURRENCY,
    2,
    1,
    64
  ),

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || '',
  defaultModel: process.env.DEFAULT_AGENT_MODEL || 'gpt-4o-mini',

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
  gcloudChatLocation: process.env.GCLOUD_CHAT_LOCATION || 'global',
  gcloudAccessToken:
    process.env.GCLOUD_ACCESS_TOKEN ||
    process.env.GOOGLE_OAUTH_ACCESS_TOKEN ||
    '',

  // Embedding Provider
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',

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
  registryUrl: process.env.REGISTRY_URL || 'http://registry:8891', // 注册中心地址
  workspaceShareBaseUrl:
    process.env.WORKSPACE_SHARE_BASE_URL || 'http://localhost:8890',
  workspaceShareUrlTtlSeconds: Math.max(
    60,
    Math.min(
      Number.parseInt(
        process.env.WORKSPACE_SHARE_URL_TTL_SECONDS || '900',
        10
      ) || 900,
      3600
    )
  ),

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',

  // Gateway identity
  gatewayInternalSecret:
    process.env.GATEWAY_INTERNAL_SECRET ||
    'dev-gateway-internal-secret-change-me',
  agentStateSigningSecret:
    process.env.AGENT_STATE_SIGNING_SECRET ||
    process.env.GATEWAY_INTERNAL_SECRET ||
    'dev-gateway-internal-secret-change-me',
  authClockSkewSeconds,
  // A request signed near the future edge of the accepted clock window can
  // remain valid for almost 2x skew. Keep the replay fence for that full span.
  gatewayNonceTtlSeconds,
  gatewayNonceKeyPrefix:
    process.env.GATEWAY_NONCE_KEY_PREFIX || 'telos:gateway:nonce',
  gatewaySignatureBodyMaxBytes: Math.max(
    1024,
    Math.min(
      Number.parseInt(
        process.env.GATEWAY_SIGNATURE_BODY_MAX_BYTES || '10485760',
        10
      ) || 10485760,
      50 * 1024 * 1024
    )
  ),
  allowAnonymousOwner: process.env.ALLOW_ANONYMOUS_OWNER === 'true',
  // Global MCP and system-agent mutations require an explicitly allowlisted
  // identity. An empty list is intentionally fail-closed.
  agentAdminUserIds: (process.env.AGENT_ADMIN_USER_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean),
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
  if (
    config.nodeEnv === 'production' &&
    config.gatewayInternalSecret === 'dev-gateway-internal-secret-change-me'
  ) {
    throw new Error(
      'GATEWAY_INTERNAL_SECRET must not use the development default in production'
    )
  }
  if (config.nodeEnv === 'production' && config.allowAnonymousOwner) {
    throw new Error('ALLOW_ANONYMOUS_OWNER must be false in production')
  }
  if (
    config.nodeEnv === 'production' &&
    config.agentStateSigningSecret === 'dev-gateway-internal-secret-change-me'
  ) {
    throw new Error(
      'AGENT_STATE_SIGNING_SECRET must not use the development default in production'
    )
  }
}

// ========== 导出 Pino Logger ==========
export { logger, createModuleLogger } from './logger.js'
