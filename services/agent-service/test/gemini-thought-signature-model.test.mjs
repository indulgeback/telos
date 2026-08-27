import assert from 'node:assert/strict'
import test from 'node:test'
import OpenAI from 'openai'
import { OpenAIChatCompletionsModel } from '@openai/agents-openai'
import { GeminiThoughtSignatureModel } from '../dist/services/gemini-thought-signature-model.js'

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

test('preserves Gemini signatures through a streamed parallel tool turn', async () => {
  const requestBodies = []
  const client = new OpenAI({
    apiKey: 'test-key',
    baseURL: 'https://gemini.invalid/v1',
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
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call-first',
                      type: 'function',
                      extra_content: {
                        google: { thought_signature: 'signature-A' },
                      },
                      function: {
                        name: 'generate_image',
                        arguments: '{"prompt":"cozy tech room"}',
                      },
                    },
                    {
                      index: 1,
                      id: 'call-second',
                      type: 'function',
                      function: {
                        name: 'get_current_time',
                        arguments: '{}',
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
              delta: { content: '已处理。' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 3,
            total_tokens: 23,
          },
        },
      ])
    },
  })
  const model = new GeminiThoughtSignatureModel(
    new OpenAIChatCompletionsModel(client, 'gemini-3.7-flash')
  )

  let firstResponse
  for await (const event of model.getStreamedResponse(
    request('画一张我的生活照')
  )) {
    if (event.type === 'response_done') firstResponse = event.response
  }

  assert.ok(firstResponse)
  assert.equal(firstResponse.output.length, 2)
  assert.equal(
    firstResponse.output[0].providerData.extra_content.google.thought_signature,
    'signature-A'
  )
  assert.equal(firstResponse.output[1].providerData, undefined)

  const results = [
    {
      type: 'function_call_result',
      callId: 'call-first',
      name: 'generate_image',
      output: { type: 'text', text: 'image generation failed' },
      status: 'completed',
    },
    {
      type: 'function_call_result',
      callId: 'call-second',
      name: 'get_current_time',
      output: { type: 'text', text: '2026-08-27' },
      status: 'completed',
    },
  ]
  for await (const _event of model.getStreamedResponse(
    request([...firstResponse.output, ...results])
  )) {
    // Drain the second turn so the request body is captured.
  }

  const assistant = requestBodies[1].messages.find(
    message => message.role === 'assistant' && message.tool_calls
  )
  assert.deepEqual(assistant.tool_calls[0].extra_content, {
    google: { thought_signature: 'signature-A' },
  })
  assert.equal(assistant.tool_calls[1].extra_content, undefined)
})
