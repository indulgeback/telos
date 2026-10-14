import test from 'node:test'
import assert from 'node:assert/strict'

const {
  executeGeminiApiGenerate,
  executeVertexAiGenerate,
  isGeminiImageModel,
} = await import('../dist/services/image-generator.js')
test('recognizes Gemini image models separately from Imagen models', () => {
  assert.equal(isGeminiImageModel('gemini-2.5-flash-image'), true)
  assert.equal(isGeminiImageModel('gemini-3.1-flash-image-preview'), true)
  assert.equal(isGeminiImageModel('imagen-3.0-generate-002'), false)
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

