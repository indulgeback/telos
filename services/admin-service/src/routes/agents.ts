import { Hono } from 'hono'
import { prisma } from '../services/db.js'

export const agentsRouter = new Hono()

// GET /api/admin/agents — 列表 (支持分页 + 搜索)
agentsRouter.get('/', async c => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '20', 10)))
  const search = c.req.query('search') || ''

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [total, agents] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        modelKey: true,
        status: true,
        isDefault: true,
        ownerId: true,
        instructionStatus: true,
        maxTurns: true,
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
      items: agents,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

// GET /api/admin/agents/:id — 详情 (含完整 instructions)
agentsRouter.get('/:id', async c => {
  const agent = await prisma.agent.findUnique({
    where: { id: c.req.param('id') },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      modelKey: true,
      temperature: true,
      maxTurns: true,
      loopMode: true,
      status: true,
      isDefault: true,
      ownerId: true,
      instructions: true,
      instructionStatus: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!agent) return c.json({ code: 404, message: 'Agent 不存在' }, 404)
  return c.json({ code: 0, data: agent })
})

// PUT /api/admin/agents/:id — 编辑 (可改 name/description/instructions/modelKey/status 等)
agentsRouter.put('/:id', async c => {
  const body = await c.req.json().catch(() => ({}))
  const allowed = [
    'name', 'description', 'instructions', 'modelKey', 'temperature',
    'maxTurns', 'loopMode', 'status', 'isDefault', 'instructionStatus',
  ] as const

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  if (Object.keys(data).length === 0) {
    return c.json({ code: 400, message: '没有可更新的字段' }, 400)
  }

  try {
    const agent = await prisma.agent.update({
      where: { id: c.req.param('id') },
      data,
      select: { id: true, name: true, updatedAt: true },
    })
    return c.json({ code: 0, data: agent, message: '更新成功' })
  } catch (e) {
    return c.json({ code: 400, message: `更新失败: ${(e as Error).message}` }, 400)
  }
})

// DELETE /api/admin/agents/:id — 删除 (系统默认 agent 不可删)
agentsRouter.delete('/:id', async c => {
  const agent = await prisma.agent.findUnique({
    where: { id: c.req.param('id') },
    select: { id: true, type: true, isDefault: true, name: true },
  })

  if (!agent) return c.json({ code: 404, message: 'Agent 不存在' }, 404)
  if (agent.type === 'system' || agent.isDefault) {
    return c.json({ code: 403, message: `系统默认 agent "${agent.name}" 不可删除` }, 403)
  }

  await prisma.agent.delete({ where: { id: agent.id } })
  return c.json({ code: 0, message: '删除成功' })
})
