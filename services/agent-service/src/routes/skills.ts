import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { created, fail, ok, parseJson } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import {
  findAccessibleSkill,
  findEditableSkill,
  skillAccessWhere,
} from '../services/skill-access.js'

export const skillsRouter = new Hono()

skillsRouter.get('/', async c => {
  const userId = getCurrentUserId(c)
  const skills = await prisma.skill.findMany({
    where: skillAccessWhere(userId),
    orderBy: { createdAt: 'desc' },
  })
  return ok(c, toSnakeCase(skills))
})

skillsRouter.post('/', async c => {
  const userId = getCurrentUserId(c)
  const body = await parseJson(c)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description =
    typeof body.description === 'string' ? body.description.trim() : ''
  const content =
    typeof body.content === 'string'
      ? body.content
      : typeof body.markdown === 'string'
        ? body.markdown
        : ''

  if (!name || !description || !content) {
    return fail(c, 400, 'name, description and content are required')
  }

  // 同一 owner 下 name 唯一（系统级 ownerId=null 单独命名空间）
  const conflict = await prisma.skill.findFirst({
    where: { name, ownerId: userId },
    select: { id: true },
  })
  if (conflict) return fail(c, 409, '同名 Skill 已存在')

  const skill = await prisma.skill.create({
    data: {
      name,
      description,
      content,
      enabled: body.enabled !== false,
      metadata: (body.metadata ?? {}) as any,
      ownerId: userId,
    },
  })
  return created(c, toSnakeCase(skill))
})

skillsRouter.get('/:id', async c => {
  const userId = getCurrentUserId(c)
  const skill = await findAccessibleSkill(c.req.param('id'), userId)
  if (!skill) return fail(c, 404, 'Skill not found')
  return ok(c, toSnakeCase(skill))
})

skillsRouter.put('/:id', async c => {
  const userId = getCurrentUserId(c)
  const body = await parseJson(c)
  const existing = await findEditableSkill(c.req.param('id'), userId)
  if (!existing) return fail(c, 403, 'Skill 不可编辑')

  const nextName =
    typeof body.name === 'string' ? body.name.trim() : undefined

  // 若改 name，需校验新 name 在该 owner 下不冲突（复合唯一约束）
  if (nextName && nextName !== existing.name) {
    const conflict = await prisma.skill.findFirst({
      where: { name: nextName, ownerId: userId, NOT: { id: existing.id } },
      select: { id: true },
    })
    if (conflict) return fail(c, 409, '同名 Skill 已存在')
  }

  const skill = await prisma.skill.update({
    where: { id: existing.id },
    data: {
      name: nextName,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : undefined,
      content:
        typeof body.content === 'string'
          ? body.content
          : typeof body.markdown === 'string'
            ? body.markdown
            : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      metadata:
        body.metadata === undefined ? undefined : (body.metadata as any),
    },
  })
  return ok(c, toSnakeCase(skill))
})

skillsRouter.delete('/:id', async c => {
  const userId = getCurrentUserId(c)
  const existing = await findEditableSkill(c.req.param('id'), userId)
  if (!existing) return fail(c, 403, 'Skill 不可删除')
  await prisma.skill.delete({ where: { id: existing.id } })
  return ok(c, { deleted: true })
})
