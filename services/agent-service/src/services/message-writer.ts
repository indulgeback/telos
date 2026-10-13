import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

/** 与 session.ts 的 MessageRole 定义保持一致(schema 枚举包含 tool) */
type MessageRole = 'user' | 'assistant' | 'tool' | 'system'

interface CreateMessageInput {
  threadId: string
  runId?: string | null
  role: MessageRole
  content: string
  parts?: unknown
  metadata?: unknown
}

function isP2002(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

/**
 * 线程内消息按 sequence 唯一 (@@unique([threadId, sequence]))。并发写入
 * (两个 run 同时完成 / 用户消息与 run 完成撞点) 时 findFirst(max)+create
 * 会撞唯一约束:捕获 P2002 重读 max 再插,最多 3 次,输家不丢单。
 */
export async function createMessageWithSequence(
  tx: Tx,
  input: CreateMessageInput
) {
  for (let attempt = 1; ; attempt += 1) {
    const last = await tx.agentMessage.findFirst({
      where: { threadId: input.threadId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    })
    try {
      return await tx.agentMessage.create({
        data: {
          threadId: input.threadId,
          runId: input.runId ?? null,
          role: input.role,
          content: input.content,
          parts: input.parts as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue,
          sequence: (last?.sequence ?? 0) + 1,
        },
      })
    } catch (error) {
      if (!isP2002(error) || attempt >= 3) throw error
    }
  }
}
