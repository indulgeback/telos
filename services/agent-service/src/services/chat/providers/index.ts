import { createBailianModel } from './bailian.js'
import { createDeepseekModel } from './deepseek.js'
import { createGcloudModel } from './gcloud.js'
import { createOpenAIModel } from './openai.js'
import { createSeedModel } from './seed.js'
import type {
  ChatProvider,
  ProviderModelRequest,
  ProviderModelResult,
} from './types.js'

type ProviderHandler = (
  request: ProviderModelRequest
) => ProviderModelResult | Promise<ProviderModelResult>

const PROVIDER_HANDLERS: Record<ChatProvider, ProviderHandler> = {
  openai: createOpenAIModel,
  deepseek: createDeepseekModel,
  seed: createSeedModel,
  bailian: createBailianModel,
  gcloud: createGcloudModel,
  shortapi: () => {
    throw new Error('ShortAPI is supported by the Agents runtime only')
  },
}

export async function createModelByProvider(
  provider: ChatProvider,
  request: ProviderModelRequest
): Promise<ProviderModelResult> {
  const handler = PROVIDER_HANDLERS[provider]
  return await handler(request)
}

export type {
  ChatProvider,
  ProviderModelRequest,
  ProviderModelResult,
  ReasoningEffort,
} from './types.js'
