import type { Prisma } from '@prisma/client'
import { prisma } from './db.js'

type SkillFindOptions = Omit<Prisma.SkillFindFirstArgs, 'where'> & {
  where?: Prisma.SkillWhereInput
}

/**
 * Skill 可见范围过滤：用户可见「自己的 + 系统级(ownerId IS NULL)」skill。
 * 对标 agent-access.ts 的 agentAccessWhere（OR[ownerId, system]）模式。
 */
export function skillAccessWhere(userId: string): Prisma.SkillWhereInput {
  return {
    OR: [{ ownerId: userId }, { ownerId: null }],
  }
}

/**
 * 查询单个 Skill（可读）：自己的或系统级的。
 * 对标 findAccessibleAgent。
 */
export async function findAccessibleSkill(
  skillId: string,
  userId: string,
  options: SkillFindOptions = {}
) {
  const { where, ...rest } = options
  return prisma.skill.findFirst({
    ...rest,
    where: {
      AND: [{ id: skillId }, skillAccessWhere(userId), where ?? {}],
    },
  })
}

/**
 * 查询单个 Skill（可编辑）：仅限自己创建的（系统级 skill 普通用户不可改）。
 * 对标 findEditableAgent：ownerId === userId。
 */
export async function findEditableSkill(
  skillId: string,
  userId: string,
  options: SkillFindOptions = {}
) {
  const { where, ...rest } = options
  return prisma.skill.findFirst({
    ...rest,
    where: {
      AND: [{ id: skillId }, { ownerId: userId }, where ?? {}],
    },
  })
}
