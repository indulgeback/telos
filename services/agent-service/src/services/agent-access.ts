import type { Prisma } from '@prisma/client'
import { prisma } from './db.js'

type AgentFindOptions = Omit<Prisma.AgentFindFirstArgs, 'where'> & {
  where?: Prisma.AgentWhereInput
}

export function agentAccessWhere(userId: string): Prisma.AgentWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { type: 'system', status: 'active' },
    ],
  }
}

export async function findDefaultAccessibleAgent(userId: string) {
  // 1. 尝试获取用户的个人默认 Agent
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultAgentId: true },
  })

  if (user?.defaultAgentId) {
    const userDefaultAgent = await findAccessibleAgent(user.defaultAgentId, userId, {
      where: { status: 'active' },
    })
    if (userDefaultAgent) {
      return userDefaultAgent
    }
  }

  // 2. 回退到系统默认的 Agent
  return prisma.agent.findFirst({
    where: {
      AND: [
        { isDefault: true },
        { status: 'active' },
        agentAccessWhere(userId),
      ],
    },
  })
}

export async function findAccessibleAgent(
  agentId: string,
  userId: string,
  options: AgentFindOptions = {}
) {
  const { where, ...rest } = options
  return prisma.agent.findFirst({
    ...rest,
    where: {
      AND: [
        { id: agentId },
        agentAccessWhere(userId),
        where ?? {},
      ],
    },
  })
}

export async function findEditableAgent(
  agentId: string,
  userId: string,
  options: AgentFindOptions = {}
) {
  const { where, ...rest } = options
  return prisma.agent.findFirst({
    ...rest,
    where: {
      AND: [
        { id: agentId },
        { ownerId: userId },
        { type: { not: 'system' } },
        { isDefault: false },
        where ?? {},
      ],
    },
  })
}
