import assert from 'node:assert/strict'
import test from 'node:test'
import OpenAI from 'openai'
import { Agent, RunState, Runner, tool } from '@openai/agents'
import { OpenAIChatCompletionsModel } from '@openai/agents-openai'
import { checkpointFunctionTool } from '../dist/services/runtime.js'

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

test('Agents SDK 0.17 serializes, approves, and resumes a tool interruption', async () => {
  let modelRequests = 0
  let toolExecutions = 0
  const checkpoints = []
  const client = new OpenAI({
    apiKey: 'sdk-test-key',
    baseURL: 'https://agents-sdk.invalid/v1',
    fetch: async () => {
      modelRequests += 1
      if (modelRequests === 1) {
        return jsonResponse({
          id: 'chatcmpl-approval',
          object: 'chat.completion',
          created: 1,
          model: 'test-model',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call-durable-1',
                    type: 'function',
                    function: {
                      name: 'mutate_record',
                      arguments: '{"value":"approved"}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 4,
            total_tokens: 9,
          },
        })
      }
      return jsonResponse({
        id: 'chatcmpl-complete',
        object: 'chat.completion',
        created: 2,
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'done' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 1,
          total_tokens: 9,
        },
      })
    },
  })
  const mutatingTool = tool({
    name: 'mutate_record',
    description: 'Mutates one record.',
    parameters: {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      additionalProperties: false,
    },
    strict: false,
    needsApproval: true,
    execute: async input => {
      toolExecutions += 1
      return `stored:${input.value}`
    },
  })
  const checkpointedTool = checkpointFunctionTool(
    mutatingTool,
    {
      async checkpointToolCall(input, execute) {
        checkpoints.push(input)
        return execute(`run-1:${input.callId}`)
      },
    },
    true
  )
  const agent = Agent.create({
    name: 'approval-test-agent',
    instructions: 'Call the tool once.',
    model: new OpenAIChatCompletionsModel(client, 'test-model'),
    tools: [checkpointedTool],
  })
  const runner = new Runner({ tracingDisabled: true })

  const interrupted = await runner.run(agent, 'start')
  assert.equal(toolExecutions, 0)
  assert.equal(interrupted.interruptions.length, 1)
  assert.equal(interrupted.interruptions[0].rawItem.callId, 'call-durable-1')

  const snapshot = interrupted.state.toString()
  assert.equal(snapshot.includes('sdk-test-key'), false)
  const resumedState = await RunState.fromString(agent, snapshot)
  const [approval] = resumedState.getInterruptions()
  resumedState.approve(approval)

  const resumed = await runner.run(agent, resumedState)
  assert.equal(toolExecutions, 1)
  assert.equal(resumed.interruptions.length, 0)
  assert.equal(resumed.finalOutput, 'done')
  assert.deepEqual(checkpoints, [
    {
      callId: 'call-durable-1',
      toolName: 'mutate_record',
      arguments: { value: 'approved' },
      sideEffect: true,
    },
  ])
})
