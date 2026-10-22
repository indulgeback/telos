import { prisma } from './db.js'
import { config } from '../config/index.js'
import { logger } from '../config/logger.js'
import { getOpenAIClient } from './memory.js'

// 与 session.ts 的 RECENT_MESSAGE_LIMIT 保持一致：最近 12 条始终以原文进入上下文，
// 更早的部分被压缩进 AgentThread.summary（经 buildMemoryInstructions 注入系统指令）。
const RECENT_MESSAGE_LIMIT = 12
// 消息数超过该阈值才触发压缩
export const COMPACTION_THRESHOLD = 24

const MAX_TRANSCRIPT_MESSAGES = 60
const MAX_MESSAGE_CHARS = 400
const MAX_SUMMARY_CHARS = 2400

const generating = new Set<string>()

export function shouldCompact(messageCount: number): boolean {
  return messageCount > COMPACTION_THRESHOLD
}

/** 组装压缩 prompt 的用户部分（纯函数，供单测） */
export function buildCompactionPrompt(
  previousSummary: string | null | undefined,
  messages: Array<{ role: string; content: string }>
): string {
  const transcript = messages
    .slice(-MAX_TRANSCRIPT_MESSAGES)
    .map(
      message =>
        `${message.role}: ${message.content.slice(0, MAX_MESSAGE_CHARS)}`
    )
    .join('\n')
  const previous = previousSummary?.trim()
  return [
    previous ? `【已有摘要】\n${previous}` : '【已有摘要】（无）',
    `【待压缩对话】\n${transcript}`,
  ].join('\n\n')
}

/** 清洗模型输出：去围栏/引号、截断；无有效内容返回 null */
export function normalizeCompactionSummary(raw: string): string | null {
  let text = (raw || '').trim()
  text = text.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/, '').trim()
  if (!text) return null
  if (text.length > MAX_SUMMARY_CHARS) {
    text = `${text.slice(0, MAX_SUMMARY_CHARS)}…`
  }
  return text
}

/**
 * 长会话压缩：把「旧摘要 + 最近 N 条之外的更早消息」用默认模型压成一份
 * 结构化摘要（目标/决定/事实/偏好/产出/未决问题），写回 AgentThread.summary。
 * 模型不可用时抛错，由调用方回退朴素拼接——绝不因压缩失败影响会话本身。
 */
export async function compactThread(
  threadId: string,
  previousSummary: string | null | undefined,
  olderMessages: Array<{ role: string; content: string }>
): Promise<string | null> {
  const meaningful = olderMessages.filter(message =>
    message.content?.trim()
  )
  if (meaningful.length === 0) return null

  const client = await getOpenAIClient()
  const response = await client.chat.completions.create({
    model: config.defaultModel,
    messages: [
      {
        role: 'system',
        content:
          '你是长对话的压缩器。把「已有摘要」和「待压缩对话」合并为一份新的滚动摘要，供 AI 助手在后续对话中恢复上下文。要求：\n' +
          '1. 用与对话相同的语言书写；不超过 1200 字；使用紧凑的分节要点，不要客套话。\n' +
          '2. 必须保留：任务目标与当前进展、已做的重要决定及理由、关键事实与数字、用户的偏好与约束、产出的文件路径/链接/工件、未解决的问题与下一步。\n' +
          '3. 冲突时以「待压缩对话」为准，覆盖「已有摘要」中过时的信息。\n' +
          '直接输出摘要正文，不要任何前后缀说明。',
      },
      { role: 'user', content: buildCompactionPrompt(previousSummary, meaningful) },
    ],
    temperature: 0.2,
    max_tokens: 900,
  })

  return normalizeCompactionSummary(
    response.choices?.[0]?.message?.content ?? ''
  )
}

/**
 * 带防重入的压缩入口（session.updateSummaries 调用）。
 * 返回新摘要；无需压缩/模型失败/并发重复时返回 null。
 */
export async function maybeCompactThread(
  threadId: string,
  previousSummary: string | null | undefined,
  olderMessages: Array<{ role: string; content: string }>
): Promise<string | null> {
  if (!shouldCompactWithCount(olderMessages)) return null
  if (generating.has(threadId)) return null
  generating.add(threadId)
  try {
    const summary = await compactThread(threadId, previousSummary, olderMessages)
    if (summary) {
      logger.info({
        msg: 'Thread compacted',
        threadId,
        summaryChars: summary.length,
        compactedMessages: olderMessages.length,
      })
    }
    return summary
  } catch (error) {
    logger.warn({ msg: 'Thread compaction failed', threadId, error })
    return null
  } finally {
    generating.delete(threadId)
  }
}

function shouldCompactWithCount(
  olderMessages: Array<{ role: string; content: string }>
): boolean {
  // older = 全量 - 最近 12 条；其数量超过阈值-最近窗口即代表总量过阈值
  return olderMessages.length > COMPACTION_THRESHOLD - RECENT_MESSAGE_LIMIT
}
