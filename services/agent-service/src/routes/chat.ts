import { Router, Request, Response } from 'express'
import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai'
import { logger } from '../config/index.js'
import {
  listChatModels,
  parseChatInput,
  runChatWithBuiltInTools,
} from '../services/chat.js'

export const chatRouter = Router()

async function sendStreamResponse(
  res: Response,
  stream: ReadableStream<UIMessageChunk>
) {
  const response = createUIMessageStreamResponse({ stream })

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
      model: parsed.selectedModel,
      reasoningEffort: parsed.reasoningEffort,
    })

    const stream = await runChatWithBuiltInTools(
      parsed.inputMessages,
      parsed.selectedModel,
      parsed.reasoningEffort
    )
    await sendStreamResponse(res, stream)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error({
      msg: 'Chat error',
      requestId,
      err: errorMessage,
    })

    if (!res.headersSent) {
      const isModelConfigError =
        errorMessage.includes('SEED_API_KEY') ||
        errorMessage.includes('DEEPSEEK_API_KEY') ||
        errorMessage.includes('chat_models')
      const statusCode = isModelConfigError ? 400 : 500

      res.status(statusCode).json({
        code: statusCode,
        message: isModelConfigError ? errorMessage : '聊天服务错误',
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

chatRouter.get('/models', async (_req: Request, res: Response) => {
  try {
    const models = await listChatModels()
    res.json({
      code: 0,
      message: 'success',
      data: models,
    })
  } catch (error) {
    logger.error({
      msg: 'List chat models error',
      err: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '获取模型列表失败',
    })
  }
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
