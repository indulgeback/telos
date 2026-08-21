import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { OpenAIChatCompletionsModel } from '@openai/agents-openai'
import { DeepSeekReasoningModel } from '../dist/services/deepseek-reasoning-model.js'

function request(input) {
  return {
    input,
    modelSettings: {},
    tools: [],
    outputType: { type: 'text' },
    handoffs: [],
    tracing: false,
  }
}

function streamResponse(chunks) {
  const body = `${chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('')}data: [DONE]\n\n`
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('DeepSeekReasoningModel', () => {
  it('把流式 reasoning_content 原样带入工具调用后的第二轮请求', async () => {
    const requestBodies = []
    const client = new OpenAI({
      apiKey: 'test-key',
      baseURL: 'https://deepseek.invalid/v1',
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body))
        requestBodies.push(body)

        if (requestBodies.length === 1) {
          return streamResponse([
            {
              id: 'chatcmpl-first',
              choices: [
                {
                  index: 0,
                  delta: { reasoning_content: '先构思落日画面。' },
                },
              ],
            },
            {
              id: 'chatcmpl-first',
              choices: [
                {
                  index: 0,
                  delta: {
                    content: '我来画。',
                    tool_calls: [
                      {
                        index: 0,
                        id: 'call-image',
                        type: 'function',
                        function: {
                          name: 'generate_image',
                          arguments: '{"prompt":"sunset"}',
                        },
                      },
                    ],
                  },
                  finish_reason: 'tool_calls',
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 8,
                total_tokens: 18,
              },
            },
          ])
        }

        return streamResponse([
          {
            id: 'chatcmpl-second',
            choices: [
              {
                index: 0,
                delta: { content: '图片已生成。' },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 20,
              completion_tokens: 4,
              total_tokens: 24,
            },
          },
        ])
      },
    })
    const model = new DeepSeekReasoningModel(
      new OpenAIChatCompletionsModel(client, 'deepseek-reasoner')
    )

    let firstResponse
    for await (const event of model.getStreamedResponse(
      request('画一张落日')
    )) {
      if (event.type === 'response_done') firstResponse = event.response
    }

    assert.ok(firstResponse)
    assert.equal(firstResponse.output[0].type, 'reasoning')
    assert.equal(firstResponse.output[0].rawContent[0].text, '先构思落日画面。')

    for await (const _event of model.getStreamedResponse(
      request([
        ...firstResponse.output,
        {
          type: 'function_call_result',
          callId: 'call-image',
          name: 'generate_image',
          output: { type: 'text', text: 'https://example.com/sunset.png' },
          status: 'completed',
        },
      ])
    )) {
      // Drain the second turn so the request body is captured.
    }

    const assistant = requestBodies[1].messages.find(
      message => message.role === 'assistant' && message.tool_calls
    )
    assert.deepEqual(assistant, {
      role: 'assistant',
      content: '我来画。',
      reasoning_content: '先构思落日画面。',
      tool_calls: [
        {
          id: 'call-image',
          type: 'function',
          function: {
            name: 'generate_image',
            arguments: '{"prompt":"sunset"}',
          },
        },
      ],
    })
  })
})
