import { Hono } from 'hono'
import { prisma } from '../services/db.js'

export const skillsRouter = new Hono()

// GET /api/admin/skills — 列表 (支持分页 + 搜索 + 分类过滤)
skillsRouter.get('/', async c => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '20', 10)))
  const search = c.req.query('search') || ''
  const category = c.req.query('category') || ''
  const systemOnly = c.req.query('system') === 'true'

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ]
  }
  if (systemOnly) where.ownerId = null
  if (category) where.metadata = { path: ['category'], equals: category }

  const [total, skills] = await Promise.all([
    prisma.skill.count({ where }),
    prisma.skill.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        enabled: true,
        metadata: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return c.json({
    code: 0,
    data: {
      items: skills,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

// GET /api/admin/skills/:id — 详情 (含完整 content)
skillsRouter.get('/:id', async c => {
  const skill = await prisma.skill.findUnique({
    where: { id: c.req.param('id') },
  })
  if (!skill) return c.json({ code: 404, message: 'Skill 不存在' }, 404)
  return c.json({ code: 0, data: skill })
})

// POST /api/admin/skills — 新建系统 skill
skillsRouter.post('/', async c => {
  const body = await c.req.json().catch(() => ({}))
  const { name, description, content, metadata, enabled } = body as Record<string, unknown>

  if (!name || !description || !content) {
    return c.json({ code: 400, message: 'name, description, content 必填' }, 400)
  }

  try {
    const skill = await prisma.skill.create({
      data: {
        name: name as string,
        description: description as string,
        content: content as string,
        enabled: enabled !== false,
        metadata: (metadata as object) ?? { category: 'productivity' },
        ownerId: null, // admin 创建的都是系统级
      },
    })
    return c.json({ code: 0, data: skill, message: '创建成功' }, 201)
  } catch (e) {
    return c.json({ code: 400, message: `创建失败: ${(e as Error).message}` }, 400)
  }
})

// PUT /api/admin/skills/:id — 编辑
skillsRouter.put('/:id', async c => {
  const body = await c.req.json().catch(() => ({}))
  const allowed = ['name', 'description', 'content', 'enabled', 'metadata'] as const

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  if (Object.keys(data).length === 0) {
    return c.json({ code: 400, message: '没有可更新的字段' }, 400)
  }

  try {
    const skill = await prisma.skill.update({
      where: { id: c.req.param('id') },
      data,
      select: { id: true, name: true, updatedAt: true },
    })
    return c.json({ code: 0, data: skill, message: '更新成功' })
  } catch (e) {
    return c.json({ code: 400, message: `更新失败: ${(e as Error).message}` }, 400)
  }
})

// DELETE /api/admin/skills/:id — 删除
skillsRouter.delete('/:id', async c => {
  try {
    await prisma.skill.delete({ where: { id: c.req.param('id') } })
    return c.json({ code: 0, message: '删除成功' })
  } catch (e) {
    return c.json({ code: 400, message: `删除失败: ${(e as Error).message}` }, 400)
  }
})
