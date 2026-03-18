import { createBailianModel } from './bailian.js'
import { createDeepseekModel } from './deepseek.js'
import { createSeedModel } from './seed.js'
import type { ChatProvider, ProviderModelRequest, ProviderModelResult } from './types.js'

type ProviderHandler = (request: ProviderModelRequest) => ProviderModelResult

const PROVIDER_HANDLERS: Record<ChatProvider, ProviderHandler> = {
  deepseek: createDeepseekModel,
  seed: createSeedModel,
  bailian: createBailianModel,
}

export function createModelByProvider(
  provider: ChatProvider,
  request: ProviderModelRequest
): ProviderModelResult {
  const handler = PROVIDER_HANDLERS[provider]
  return handler(request)
}

export type { ChatProvider, ProviderModelRequest, ProviderModelResult, ReasoningEffort } from './types.js'
