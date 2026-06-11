import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { created, fail, ok, parseJson } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'

export const toolsRouter = new Hono()

toolsRouter.get('/', async c => {
  const page = Number(c.req.query('page') || 1)
  const pageSize = Number(c.req.query('page_size') || c.req.query('pageSize') || 50)
  const search = c.req.query('search')
  const category = c.req.query('category')
  const enabledRaw = c.req.query('enabled')
  const where: any = {}
  if (category) where.category = category
  if (enabledRaw !== undefined) where.enabled = enabledRaw === 'true'
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [tools, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tool.count({ where }),
  ])

  return ok(c, {
    tools: toSnakeCase(tools),
    total,
    page,
    page_size: pageSize,
  })
})

toolsRouter.get('/:id', async c => {
  const item = await prisma.tool.findUnique({ where: { id: c.req.param('id') } })
  if (!item) return fail(c, 404, 'Tool not found')
  return ok(c, toSnakeCase(item))
})
