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
  const search = c.req.query('search')?.trim()
  const category = c.req.query('category')?.trim()
  const sort = c.req.query('sort')?.trim()

  const where: any = { AND: [skillAccessWhere(userId)] }
  if (search) {
    where.AND.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    })
  }
  if (category && category !== 'all') {
    // 分类存在 metadata.category 里(Json 路径查询)
    if (category === 'office') {
      where.AND.push({
        OR: [
          { metadata: { path: ['category'], equals: 'office' } },
          { metadata: { path: ['category'], equals: 'data' } },
        ],
      })
    } else {
      where.AND.push({
        metadata: { path: ['category'], equals: category },
      })
    }
  }

  // sort: 'recent'(默认) | 'name' | 'popular'(暂按 createdAt 兜底,未来按 metadata.installs)
  const orderBy =
    sort === 'name'
      ? { name: 'asc' as const }
      : { createdAt: 'desc' as const }

  const skills = await prisma.skill.findMany({ where, orderBy })
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

/**
 * 安装系统技能到用户库(克隆)。
 * 仅系统技能(ownerId=null)可被安装;克隆为用户的私有副本,
 * 用户可自由编辑副本而不影响系统原版。幂等:已安装同名则返回已有。
 */
skillsRouter.post('/:id/install', async c => {
  const userId = getCurrentUserId(c)
  const source = await prisma.skill.findUnique({
    where: { id: c.req.param('id') },
  })
  if (!source || source.ownerId !== null) {
    return fail(c, 404, '技能不存在或不可安装')
  }

  // 幂等:用户已安装同名技能则直接返回已有副本
  const existing = await prisma.skill.findFirst({
    where: { ownerId: userId, name: source.name },
  })
  if (existing) {
    return ok(c, {
      installed: false,
      skill: toSnakeCase(existing),
      message: 'already_installed',
    })
  }

  // 克隆到用户命名空间,metadata 记录溯源
  const sourceMeta =
    (source.metadata as { category?: string } & Record<string, unknown>) ?? {}
  const installed = await prisma.skill.create({
    data: {
      name: source.name,
      description: source.description,
      content: source.content,
      enabled: true,
      metadata: {
        ...sourceMeta,
        category: sourceMeta.category,
        installedFrom: source.id,
      } as any,
      ownerId: userId,
    },
  })
  return created(c, {
    installed: true,
    skill: toSnakeCase(installed),
    message: 'installed',
  })
})

skillsRouter.delete('/:id', async c => {
  const userId = getCurrentUserId(c)
  const existing = await findEditableSkill(c.req.param('id'), userId)
  if (!existing) return fail(c, 403, 'Skill 不可删除')
  await prisma.skill.delete({ where: { id: existing.id } })
  return ok(c, { deleted: true })
})
