import { prisma } from './db.js'
import { config } from '../config/index.js'
import { logger } from '../config/logger.js'
import { safeJsonStringify } from '../utils/json.js'
import { getOpenAIClient } from './memory.js'
import { titleFromInput } from './session.js'

/**
 * 会话标题由首条消息截断初始化(titleFromInput)。首轮对话完成后,用默认模型
 * 生成一个概括性标题;若用户已手动重命名(标题不再等于初始截断),则跳过。
 * 单实例内用 Set 防重复触发;多实例并发时最后写入者胜,无害。
 */
const generating = new Set<string>()

export function maybeGenerateThreadTitle(threadId: string): void {
  if (generating.has(threadId)) return
  generating.add(threadId)
  void generateThreadTitle(threadId)
    .catch(error => {
      logger.warn({ msg: 'Thread title generation failed', threadId, error })
    })
    .finally(() => {
      generating.delete(threadId)
    })
}

/** 标题是否仍是初始截断(等于 titleFromInput(首条用户消息)),未被用户改名 */
export function shouldGenerateTitle(
  threadTitle: string,
  firstUserText: string
): boolean {
  if (!firstUserText.trim()) return false
  return threadTitle === titleFromInput(firstUserText)
}

export function normalizeGeneratedTitle(raw: string): string {
  const firstLine = (raw || '').trim().split('\n')[0]
  return firstLine
    .replace(/^["'「『《《]+/, '')
    .replace(/["'」』》。.」』]+$/, '')
    .trim()
    .slice(0, 50)
}

async function generateThreadTitle(threadId: string): Promise<void> {
  const thread = await prisma.agentThread.findUnique({
    where: { id: threadId },
    select: { title: true },
  })
  if (!thread) return

  const firstUser = await prisma.agentMessage.findFirst({
    where: { threadId, role: 'user' },
    orderBy: { sequence: 'asc' },
    select: { content: true },
  })
  const firstUserText =
    typeof firstUser?.content === 'string'
      ? firstUser.content
      : safeJsonStringify(firstUser?.content ?? '')
  if (!shouldGenerateTitle(thread.title, firstUserText)) return

  const firstAssistant = await prisma.agentMessage.findFirst({
    where: { threadId, role: 'assistant' },
    orderBy: { sequence: 'asc' },
    select: { content: true },
  })
  const assistantText = (
    typeof firstAssistant?.content === 'string'
      ? firstAssistant.content
      : safeJsonStringify(firstAssistant?.content ?? '')
  )
    .slice(0, 800)
    .trim()

  const client = await getOpenAIClient()
  const response = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [
      {
        role: 'system',
        content:
          '你是一个会话标题生成器。根据对话内容生成一个简短准确的标题：不超过16个字，概括对话主题；不要引号、句号或任何前后缀和说明，直接输出标题文本本身。',
      },
      {
        role: 'user',
        content: `【用户】${firstUserText.slice(0, 500)}\n【助手】${assistantText || '(未回复)'}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 40,
  })

  const title = normalizeGeneratedTitle(
    response.choices?.[0]?.message?.content ?? ''
  )
  if (!title) return

  await prisma.agentThread.update({ where: { id: threadId }, data: { title } })
  logger.info({ msg: 'Thread title generated', threadId, title })
}
