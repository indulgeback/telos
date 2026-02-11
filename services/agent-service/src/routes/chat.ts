import { Router, Request, Response } from 'express'
import { AIMessageChunk } from '@langchain/core/messages'
import { createUIMessageStreamResponse } from 'ai'
import { toUIMessageStream } from '@ai-sdk/langchain'
import { logger } from '../config/index.js'
import { parseChatInput, runChatWithBuiltInTools } from '../services/chat.js'

export const chatRouter = Router()

async function sendStreamResponse(
  res: Response,
  stream: ReadableStream | AsyncIterable<AIMessageChunk>
) {
  const uiStream = toUIMessageStream(stream)
  const response = createUIMessageStreamResponse({ stream: uiStream })

  res.status(response.status)
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(Buffer.from(value))
  }
  res.end()
}

/**
 * POST /api/agent
 * AI SDK data stream response
 */
async function handleChat(req: Request, res: Response) {
  const requestId = req.header('X-Request-ID') || `req-${Date.now()}`

  try {
    const parsed = await parseChatInput(req.body)

    if (!parsed) {
      res.status(400).json({
        code: 400,
        message: '消息不能为空',
      })
      return
    }

    logger.info({
      msg: 'Chat request received',
      requestId,
      messageLength: parsed.lastMessageText.length,
    })

    const stream = await runChatWithBuiltInTools(parsed.inputMessages)
    await sendStreamResponse(res, stream)
  } catch (error) {
    logger.error({
      msg: 'Chat error',
      requestId,
      err: error instanceof Error ? error.message : String(error),
    })

    if (!res.headersSent) {
      res.status(500).json({
        code: 500,
        message: '聊天服务错误',
      })
    } else {
      res.end()
    }
  }
}

chatRouter.post('/', handleChat)

chatRouter.post('/chat', async (req: Request, res: Response) => {
  await handleChat(req, res)
})

// ========== 健康检查 ==========

chatRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    time: new Date().toISOString(),
    service: 'agent-service',
  })
})

chatRouter.get('/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready' })
})

chatRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    service: 'agent-service',
    version: '1.0.0',
    framework: 'ai-sdk + langchain',
  })
})
