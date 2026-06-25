import type { AgentInputItem } from '@openai/agents'
import { prisma } from './db.js'
import { safeJsonStringify } from '../utils/json.js'
import { retrieveMemories, extractAndSynthesizeMemories } from './memory.js'

const RECENT_MESSAGE_LIMIT = 12
const SUMMARY_THRESHOLD = 20
export const ANONYMOUS_OWNER_ID = 'anonymous'

type MessageRole = 'user' | 'assistant' | 'tool' | 'system'

export interface EnsureThreadOptions {
  agentId: string
  threadId?: string | null
  ownerId?: string | null
  firstInput?: string
  metadata?: unknown
}

export interface RuntimeContextInput {
  input: AgentInputItem[]
  memoryInstructions: string
}

function normalizeOwnerId(ownerId?: string | null) {
  return ownerId?.trim() || ANONYMOUS_OWNER_ID
}

function titleFromInput(input?: string) {
  const text = (input || '新会话').trim().replace(/\s+/g, ' ')
  if (!text) return '新会话'
  return text.slice(0, /[\u4e00-\u9fff]/.test(text) ? 24 : 48)
}

function toContent(value: unknown) {
  if (typeof value === 'string') return value
  return safeJsonStringify(value)
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function formatList(title: string, items: string[]) {
  return items.length ? `${title}\n${items.map(item => `- ${item}`).join('\n')}` : ''
}

function buildMemoryInstructions(options: {
  longTermMemories: string[]
  threadSummary?: string | null
  approvedPlan?: string | null
}) {
  const blocks: string[] = []

  if (options.longTermMemories && options.longTermMemories.length > 0) {
    const memoryList = options.longTermMemories
      .map(item => `- ${item}`)
      .join('\n')
    blocks.push(`# Long-term Memory\nHere are relevant facts from previous conversations with the user:\n${memoryList}`)
  }

  if (options.threadSummary?.trim()) {
    blocks.push(`# Conversation Summary\n${options.threadSummary.trim()}`)
  }

  if (options.approvedPlan?.trim()) {
    blocks.push(`# Approved Plan\n用户已批准以下执行计划，请严格参照执行：\n${options.approvedPlan.trim()}`)
  }

  return blocks.join('\n\n')
}

/**
 * 从消息列表中查找最近一条状态为 approved 的 plan part。
 * 返回计划的可读文本（summary + steps），供注入到 memoryInstructions。
 * messages 应为按 sequence desc 排序的消息列表。
 */
function findApprovedPlan(
  messages: Array<{ role: string; parts?: unknown }>
): string | null {
  for (const message of messages) {
    if (!Array.isArray(message.parts)) continue
    for (const part of message.parts) {
      if (!part || typeof part !== 'object') continue
      const raw = part as Record<string, any>
      if (raw.type !== 'plan') continue
      const plan = raw.plan ?? raw // 兼容 {type:'plan', plan:{...}} 和扁平结构
      if (plan.status !== 'approved') continue
      const summary = typeof plan.summary === 'string' ? plan.summary : ''
      const steps: any[] = Array.isArray(plan.steps) ? plan.steps : []
      if (!summary && steps.length === 0) continue
      const stepsText = steps
        .map(
          (s, i) =>
            `${i + 1}. ${typeof s.description === 'string' ? s.description : ''}`
        )
        .join('\n')
      return `${summary}\n${stepsText}`.trim() || null
    }
  }
  return null
}

function messageToAgentInput(message: {
  role: MessageRole
  content: string
  parts?: any
}): AgentInputItem {
  const role =
    message.role === 'assistant' || message.role === 'system'
      ? message.role
      : 'user'

  if (role === 'user' && Array.isArray(message.parts) && message.parts.length > 0) {
    const imageUrls: string[] = []
    message.parts.forEach((part: any) => {
      if (!part || typeof part !== 'object') return
      let url = ''
      if (part.type === 'image_url' && part.image_url) {
        if (typeof part.image_url === 'string') {
          url = part.image_url
        } else if (typeof part.image_url === 'object' && typeof part.image_url.url === 'string') {
          url = part.image_url.url
        }
      } else if (part.type === 'image' && typeof part.url === 'string') {
        url = part.url
      }
      if (url.trim()) {
        imageUrls.push(url.trim())
      }
    })

    if (imageUrls.length > 0) {
      const content = [
        {
          type: 'input_text' as const,
          text: message.content.trim() || '请描述这张图片',
        },
        ...imageUrls.map(url => ({
          type: 'input_image' as const,
          image: url,
        })),
      ]
      return {
        type: 'message',
        role,
        content: content as any,
      } as any
    }
  }

  return {
    type: 'message',
    role,
    content: message.content,
  } as AgentInputItem
}

function summarizeMessages(
  previousSummary: string | null | undefined,
  messages: Array<{ role: string; content: string }>
) {
  const older = messages
    .map(message => `${message.role}: ${message.content}`)
    .join('\n')
    .trim()
  const combined = [
    ...new Set(
      [previousSummary, older]
        .filter(Boolean)
        .join('\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
    ),
  ].join('\n')
  if (!combined) return null
  return combined.length > 4000
    ? `...${combined.slice(combined.length - 4000)}`
    : combined
}

function isQuestionLike(content: string) {
  return /[?？]/.test(content)
}

function isPreferenceLike(content: string) {
  return !isQuestionLike(content) && /我(喜欢|偏好|更想|希望|习惯)/.test(content)
}

function isFactLike(content: string) {
  if (isQuestionLike(content)) return false
  return /^(请记住|记住|你要记住|我是|我叫|我的)/.test(content)
}

function cleanMemoryItems(items: unknown, matcher: (content: string) => boolean) {
  return toStringList(items).filter(item => matcher(item.trim()))
}

function extractReusableFacts(messages: Array<{ role: string; content: string }>) {
  const facts = new Set<string>()
  const preferences = new Set<string>()

  for (const message of messages) {
    if (message.role !== 'user') continue
    const content = message.content.trim()
    if (!content) continue
    if (isPreferenceLike(content)) {
      preferences.add(content.slice(0, 160))
    }
    if (isFactLike(content)) {
      facts.add(content.slice(0, 160))
    }
  }

  return {
    facts: [...facts].slice(-20),
    preferences: [...preferences].slice(-20),
  }
}

export class AgentSessionService {
  normalizeOwnerId(ownerId?: string | null) {
    return normalizeOwnerId(ownerId)
  }

  async ensureThread(options: EnsureThreadOptions) {
    const ownerId = normalizeOwnerId(options.ownerId)

    if (options.threadId) {
      const thread = await prisma.agentThread.findUnique({
        where: { id: options.threadId },
      })
      if (!thread || thread.status === 'deleted') {
        throw new Error('Thread not found')
      }
      if (thread.agentId !== options.agentId) {
        throw new Error('Thread does not belong to this agent')
      }
      if (thread.ownerId !== ownerId) {
        throw new Error('Thread not found')
      }
      return thread
    }

    return prisma.agentThread.create({
      data: {
        agentId: options.agentId,
        ownerId,
        title: titleFromInput(options.firstInput),
        metadata: (options.metadata ?? {}) as any,
        lastMessageAt: new Date(),
      },
    })
  }

  async appendMessage(options: {
    threadId: string
    runId?: string | null
    role: MessageRole
    content: unknown
    parts?: unknown
    metadata?: unknown
  }) {
    return prisma.$transaction(async tx => {
      const last = await tx.agentMessage.findFirst({
        where: { threadId: options.threadId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      })
      const message = await tx.agentMessage.create({
        data: {
          threadId: options.threadId,
          runId: options.runId ?? null,
          role: options.role,
          content: toContent(options.content),
          parts: (options.parts ?? []) as any,
          metadata: (options.metadata ?? {}) as any,
          sequence: (last?.sequence ?? 0) + 1,
        },
      })
      await tx.agentThread.update({
        where: { id: options.threadId },
        data: { lastMessageAt: new Date() },
      })
      return message
    })
  }

  async appendUserMessage(threadId: string, input: string, parts?: unknown) {
    let formattedParts: any[] = []
    if (Array.isArray(parts)) {
      formattedParts = parts
        .map(item => {
          if (typeof item === 'string') {
            const url = item.trim()
            if (
              url &&
              (/^https?:\/\//i.test(url) || /^data:image\/[a-zA-Z]+;base64,/i.test(url))
            ) {
              return {
                type: 'image_url',
                image_url: { url }
              }
            }
          } else if (item && typeof item === 'object') {
            return item
          }
          return null
        })
        .filter(Boolean)
    }
    return this.appendMessage({
      threadId,
      role: 'user',
      content: input,
      parts: formattedParts.length > 0 ? formattedParts : undefined,
    })
  }

  async appendAssistantMessage(
    threadId: string,
    runId: string,
    finalOutput: string,
    parts?: unknown
  ) {
    return this.appendMessage({
      threadId,
      runId,
      role: 'assistant',
      content: finalOutput,
      parts,
    })
  }

  async buildRuntimeInput(threadId: string): Promise<RuntimeContextInput> {
    const thread = await prisma.agentThread.findUnique({
      where: { id: threadId },
      include: {
        agent: true,
      },
    })
    if (!thread) throw new Error('Thread not found')

    const messages = await prisma.agentMessage.findMany({
      where: { threadId },
      orderBy: { sequence: 'desc' },
      take: RECENT_MESSAGE_LIMIT,
      select: { role: true, content: true, parts: true },
    })

    // 获取最近一条用户消息作为长期记忆检索 query
    const lastUserMsg = messages.find(msg => msg.role === 'user')
    const query = lastUserMsg?.content || ''

    // 相似性检索相似的长期记忆片段
    const matchedMemories = await retrieveMemories(
      thread.agentId,
      normalizeOwnerId(thread.ownerId),
      query,
      5,
      undefined,
      messages.length
    )

    // 检查最近消息中是否存在已批准的计划，若有则作为显式上下文注入
    const approvedPlan = findApprovedPlan(messages)

    return {
      input: [...messages].reverse().map(messageToAgentInput),
      memoryInstructions: buildMemoryInstructions({
        longTermMemories: matchedMemories,
        threadSummary: thread.summary,
        approvedPlan,
      }),
    }
  }

  scheduleSummaries(threadId: string, agentId: string, ownerId?: string | null) {
    void this.updateSummaries(threadId, agentId, ownerId).catch(() => undefined)
  }

  async updateSummaries(
    threadId: string,
    agentId: string,
    ownerId?: string | null
  ) {
    const normalizedOwnerId = normalizeOwnerId(ownerId)
    const count = await prisma.agentMessage.count({ where: { threadId } })
    const messages = await prisma.agentMessage.findMany({
      where: { threadId },
      orderBy: { sequence: 'asc' },
      select: { role: true, content: true },
    })

    if (count > SUMMARY_THRESHOLD) {
      const older = messages.slice(0, Math.max(0, count - RECENT_MESSAGE_LIMIT))
      const thread = await prisma.agentThread.findUnique({
        where: { id: threadId },
        select: { summary: true },
      })
      const summary = summarizeMessages(thread?.summary, older)
      if (summary) {
        await prisma.agentThread.update({
          where: { id: threadId },
          data: { summary },
        })
      }
    }

    // 后台提取并合成长期记忆事实存入向量数据库中
    await extractAndSynthesizeMemories(agentId, normalizedOwnerId, messages)
  }

  async listThreads(options: {
    agentId?: string | null
    ownerId?: string | null
  }) {
    const where: Record<string, unknown> = { status: 'active' }
    if (options.agentId) where.agentId = options.agentId
    if (options.ownerId) where.ownerId = normalizeOwnerId(options.ownerId)
    return prisma.agentThread.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async createThread(options: {
    agentId: string
    ownerId?: string | null
    title?: string
    metadata?: unknown
  }) {
    return prisma.agentThread.create({
      data: {
        agentId: options.agentId,
        ownerId: normalizeOwnerId(options.ownerId),
        title: options.title?.trim() || '新会话',
        metadata: (options.metadata ?? {}) as any,
        lastMessageAt: new Date(),
      },
    })
  }

  async listMessages(threadId: string) {
    return prisma.agentMessage.findMany({
      where: { threadId },
      orderBy: { sequence: 'asc' },
    })
  }

  async listMessagesForOwner(threadId: string, ownerId: string) {
    const thread = await prisma.agentThread.findFirst({
      where: {
        id: threadId,
        ownerId: normalizeOwnerId(ownerId),
        status: { not: 'deleted' },
      },
      select: { id: true },
    })
    if (!thread) throw new Error('Thread not found')
    return prisma.agentMessage.findMany({
      where: { threadId },
      orderBy: { sequence: 'asc' },
    })
  }

  async updateThread(
    threadId: string,
    data: { title?: unknown; status?: unknown },
    ownerId?: string
  ) {
    const update: Record<string, unknown> = {}
    if (typeof data.title === 'string' && data.title.trim()) {
      update.title = data.title.trim()
    }
    if (data.status === 'active' || data.status === 'archived') {
      update.status = data.status
    }
    if (ownerId) {
      const existing = await prisma.agentThread.findFirst({
        where: {
          id: threadId,
          ownerId: normalizeOwnerId(ownerId),
          status: { not: 'deleted' },
        },
        select: { id: true },
      })
      if (!existing) throw new Error('Thread not found')
    }
    return prisma.agentThread.update({
      where: { id: threadId },
      data: update as any,
    })
  }

  async deleteThread(threadId: string, ownerId?: string) {
    if (ownerId) {
      const existing = await prisma.agentThread.findFirst({
        where: {
          id: threadId,
          ownerId: normalizeOwnerId(ownerId),
          status: { not: 'deleted' },
        },
        select: { id: true },
      })
      if (!existing) throw new Error('Thread not found')
    }
    return prisma.agentThread.update({
      where: { id: threadId },
      data: { status: 'deleted' },
    })
  }
}

export const agentSessionService = new AgentSessionService()
