import { Hono } from 'hono'
import { prisma } from '../services/db.js'

export const modelsRouter = new Hono()

// GET /api/admin/models — 列出所有 chat model
modelsRouter.get('/', async c => {
  const models = await prisma.chatModel.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return c.json({ code: 0, data: { items: models } })
})

// POST /api/admin/models — 新建
modelsRouter.post('/', async c => {
  const body = await c.req.json().catch(() => ({}))
  const { modelKey, displayName, provider, isReasoning, isEnabled, sortOrder, supportVision, supportReasoningControl } = body as Record<string, unknown>

  if (!modelKey || !displayName || !provider) {
    return c.json({ code: 400, message: 'modelKey, displayName, provider 必填' }, 400)
  }

  try {
    const model = await prisma.chatModel.create({
      data: {
        modelKey: modelKey as string,
        displayName: displayName as string,
        provider: provider as any, // ChatModelProvider enum, 运行时 Prisma 校验
        isReasoning: Boolean(isReasoning),
        isEnabled: isEnabled !== false,
        sortOrder: Number(sortOrder || 0),
        supportVision: Boolean(supportVision),
        supportReasoningControl: Boolean(supportReasoningControl),
      },
    })
    return c.json({ code: 0, data: model, message: '创建成功' }, 201)
  } catch (e) {
    return c.json({ code: 400, message: `创建失败: ${(e as Error).message}` }, 400)
  }
})

// PUT /api/admin/models/:id — 编辑
modelsRouter.put('/:id', async c => {
  const body = await c.req.json().catch(() => ({}))
  const allowed = ['modelKey', 'displayName', 'provider', 'isReasoning', 'isEnabled', 'sortOrder', 'supportVision', 'supportReasoningControl'] as const

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  if (Object.keys(data).length === 0) {
    return c.json({ code: 400, message: '没有可更新的字段' }, 400)
  }
  // provider 是 enum, 转成兼容类型
  if ('provider' in data) data.provider = data.provider as any

  try {
    const model = await prisma.chatModel.update({
      where: { id: c.req.param('id') },
      data,
      select: { id: true, modelKey: true, updatedAt: true },
    })
    return c.json({ code: 0, data: model, message: '更新成功' })
  } catch (e) {
    return c.json({ code: 400, message: `更新失败: ${(e as Error).message}` }, 400)
  }
})

// DELETE /api/admin/models/:id — 删除
modelsRouter.delete('/:id', async c => {
  try {
    await prisma.chatModel.delete({ where: { id: c.req.param('id') } })
    return c.json({ code: 0, message: '删除成功' })
  } catch (e) {
    return c.json({ code: 400, message: `删除失败: ${(e as Error).message}` }, 400)
  }
})
