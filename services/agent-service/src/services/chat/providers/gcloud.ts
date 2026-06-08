import { ChatOpenAI } from '@langchain/openai'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from '../../gcloud.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export function createGcloudModel({
  model,
  reasoningEffort,
}: ProviderModelRequest): ProviderModelResult {
  return {
    provider: 'gcloud',
    model: new ChatOpenAI({
      apiKey: getGcloudAccessToken(),
      model,
      temperature: 0.7,
      modelKwargs:
        reasoningEffort === 'minimal'
          ? {}
          : {
              reasoning_effort: reasoningEffort,
            },
      __includeRawResponse: true,
      configuration: {
        baseURL: getGcloudOpenAIBaseUrl(),
      },
    }),
  }
}
