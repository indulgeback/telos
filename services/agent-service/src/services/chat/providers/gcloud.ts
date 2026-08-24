import { ChatOpenAI } from '@langchain/openai'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from '../../gcloud.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export async function createGcloudModel({
  model,
  reasoningEffort,
}: ProviderModelRequest): Promise<ProviderModelResult> {
  const [apiKey, baseURL] = await Promise.all([
    getGcloudAccessToken(),
    getGcloudOpenAIBaseUrl(),
  ])

  return {
    provider: 'gcloud',
    model: new ChatOpenAI({
      apiKey,
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
        baseURL,
      },
    }),
  }
}
