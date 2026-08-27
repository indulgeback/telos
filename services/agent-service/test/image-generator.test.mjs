import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const previousShortApiKey = process.env.SHORTAPI_API_KEY
const previousShortApiBaseUrl = process.env.SHORTAPI_BASE_URL
process.env.SHORTAPI_API_KEY = 'image-generator-test-key'
process.env.SHORTAPI_BASE_URL = 'https://shortapi.example.test/v1'

const {
  executeGeminiApiGenerate,
  executeGenerateImage,
  executeVertexAiGenerate,
  isGeminiImageModel,
  resolveShortApiJobBaseUrl,
} = await import('../dist/services/image-generator.js')
const { WorkspaceManager } = await import('../dist/services/workspace.js')
if (previousShortApiKey === undefined) delete process.env.SHORTAPI_API_KEY
else process.env.SHORTAPI_API_KEY = previousShortApiKey
if (previousShortApiBaseUrl === undefined) delete process.env.SHORTAPI_BASE_URL
else process.env.SHORTAPI_BASE_URL = previousShortApiBaseUrl

test('recognizes Gemini image models separately from Imagen models', () => {
  assert.equal(isGeminiImageModel('gemini-2.5-flash-image'), true)
  assert.equal(isGeminiImageModel('gemini-3.1-flash-image-preview'), true)
  assert.equal(isGeminiImageModel('imagen-3.0-generate-002'), false)
})

test('resolves the image jobs path from the configured ShortAPI base URL', () => {
  assert.equal(
    resolveShortApiJobBaseUrl('https://api.shortapi.ai/v1'),
    'https://api.shortapi.ai/api/v1'
  )
  assert.equal(
    resolveShortApiJobBaseUrl('https://api.shortapi.ai/api/v1/'),
    'https://api.shortapi.ai/api/v1'
  )
})

test('uses generateContent and imageConfig for Vertex Gemini image models', async () => {
  const calls = []
  const client = {
    models: {
      generateContent: async params => {
        calls.push({ kind: 'content', params })
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: 'generated-gemini-image',
                    },
                  },
                ],
              },
            },
          ],
        }
      },
      generateImages: async params => {
        calls.push({ kind: 'images', params })
        throw new Error('generateImages must not be used for Gemini models')
      },
    },
  }

  const generated = await executeVertexAiGenerate(
    client,
    'gemini-2.5-flash-image',
    'a test image',
    '9:16'
  )

  assert.equal(generated.mimeType, 'image/png')
  assert.equal(generated.base64Data, 'generated-gemini-image')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].kind, 'content')
  assert.deepEqual(calls[0].params.config, {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio: '9:16' },
  })
})

test('passes aspect ratio to direct Gemini image generation', async () => {
  let params
  const client = {
    models: {
      generateContent: async input => {
        params = input
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: 'generated-direct-gemini-image',
                    },
                  },
                ],
              },
            },
          ],
        }
      },
    },
  }

  const generated = await executeGeminiApiGenerate(
    client,
    'gemini-3.1-flash-image-preview',
    'a direct test image',
    '9:16'
  )

  assert.equal(generated.mimeType, 'image/png')
  assert.equal(generated.base64Data, 'generated-direct-gemini-image')
  assert.deepEqual(params.config, {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio: '9:16' },
  })
})

test('keeps generateImages for explicit Imagen models', async () => {
  const calls = []
  const client = {
    models: {
      generateImages: async params => {
        calls.push(params)
        return {
          generatedImages: [{ image: { imageBytes: 'generated-imagen' } }],
        }
      },
      generateContent: async () => {
        throw new Error('generateContent must not be used for Imagen models')
      },
    },
  }

  const generated = await executeVertexAiGenerate(
    client,
    'imagen-4.0-generate-001',
    'a test image',
    '16:9',
    'no blur'
  )

  assert.equal(generated.mimeType, 'image/jpeg')
  assert.equal(generated.base64Data, 'generated-imagen')
  assert.deepEqual(calls[0].config, {
    numberOfImages: 1,
    aspectRatio: '16:9',
    negativePrompt: 'no blur',
    outputMimeType: 'image/jpeg',
  })
})

test('uses configured ShortAPI URL and retries only the idempotent query', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  let queryAttempts = 0
  const threadId = `image-generator-test-${Date.now()}`

  globalThis.fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, method: init?.method || 'GET' })

    if (url.endsWith('/job/create')) {
      return new Response(JSON.stringify({ data: { job_id: 'job-1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    if (url.includes('/job/query?id=job-1')) {
      queryAttempts++
      if (queryAttempts === 1) {
        throw new TypeError('fetch failed', {
          cause: new Error('ECONNRESET'),
        })
      }
      return new Response(
        JSON.stringify({
          data: {
            status: 2,
            result: {
              images: [
                {
                  url: 'data:image/png;base64,iVBORw0KGgo=',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    }

    throw new Error(`unexpected request: ${url}`)
  }

  try {
    const result = await executeGenerateImage(
      {
        prompt: 'a test image',
        model: 'gpt-image-2',
        aspect_ratio: '9:16',
      },
      threadId
    )

    assert.equal(result.success, true)
    assert.equal(queryAttempts, 2)
    assert.deepEqual(requests.slice(0, 3), [
      {
        url: 'https://shortapi.example.test/api/v1/job/create',
        method: 'POST',
      },
      {
        url: 'https://shortapi.example.test/api/v1/job/query?id=job-1',
        method: 'GET',
      },
      {
        url: 'https://shortapi.example.test/api/v1/job/query?id=job-1',
        method: 'GET',
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
    fs.rmSync(WorkspaceManager.getWorkspacePath(threadId), {
      force: true,
      recursive: true,
    })
    fs.rmSync(
      path.resolve(
        process.cwd(),
        '.persisted-workspaces',
        'workspaces',
        threadId
      ),
      {
        force: true,
        recursive: true,
      }
    )
  }
})
