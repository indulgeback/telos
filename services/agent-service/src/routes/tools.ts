import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { created, fail, ok, parseJson } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'
import { isAuthenticatedAdmin } from '../middleware/gatewayIdentity.js'
import { isToolUserAssignable, safeTool } from '../services/tool-access.js'

export const toolsRouter = new Hono()

toolsRouter.get('/', async c => {
  const page = Math.max(1, Number(c.req.query('page') || 1) || 1)
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Number(c.req.query('page_size') || c.req.query('pageSize') || 50) || 50
    )
  )
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

  if (isAuthenticatedAdmin(c)) {
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
  }

  // The global registry is small. Filter before pagination so ordinary users
  // receive an accurate total without exposing non-assignable definitions.
  const candidates = await prisma.tool.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  const visible = candidates.filter(isToolUserAssignable).map(safeTool)
  const tools = visible.slice((page - 1) * pageSize, page * pageSize)

  return ok(c, {
    tools: toSnakeCase(tools),
    total: visible.length,
    page,
    page_size: pageSize,
  })
})

toolsRouter.get('/:id', async c => {
  const item = await prisma.tool.findUnique({
    where: { id: c.req.param('id') },
  })
  if (!item) return fail(c, 404, 'Tool not found')
  if (!isAuthenticatedAdmin(c) && !isToolUserAssignable(item)) {
    return fail(c, 404, 'Tool not found')
  }
  return ok(c, toSnakeCase(isAuthenticatedAdmin(c) ? item : safeTool(item)))
})
