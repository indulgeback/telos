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
