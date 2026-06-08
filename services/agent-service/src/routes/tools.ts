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

toolsRouter.post('/', async c => {
  const body = await parseJson(c)
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const displayName =
    typeof body.display_name === 'string'
      ? body.display_name
      : typeof body.displayName === 'string'
        ? body.displayName
        : name
  const description =
    typeof body.description === 'string' ? body.description.trim() : ''
  if (!id || !name || !description) {
    return fail(c, 400, 'id, name and description are required')
  }

  const item = await prisma.tool.create({
    data: {
      id,
      name,
      displayName,
      description,
      type: body.type === 'streamable' ? 'streamable' : 'invokable',
      category: typeof body.category === 'string' ? body.category : 'custom',
      endpoint: (body.endpoint ?? {}) as any,
      parameters: (body.parameters ?? {}) as any,
      responseTransform:
        (body.response_transform ?? body.responseTransform ?? {}) as any,
      rateLimit: (body.rate_limit ?? body.rateLimit ?? null) as any,
      enabled: body.enabled !== false,
      version: typeof body.version === 'string' ? body.version : '1.0.0',
      tags: (body.tags ?? []) as any,
    },
  })
  return created(c, toSnakeCase(item))
})

toolsRouter.get('/:id', async c => {
  const item = await prisma.tool.findUnique({ where: { id: c.req.param('id') } })
  if (!item) return fail(c, 404, 'Tool not found')
  return ok(c, toSnakeCase(item))
})

toolsRouter.put('/:id', async c => {
  const body = await parseJson(c)
  const item = await prisma.tool.update({
    where: { id: c.req.param('id') },
    data: {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      displayName:
        typeof body.display_name === 'string'
          ? body.display_name
          : typeof body.displayName === 'string'
            ? body.displayName
            : undefined,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : undefined,
      type:
        body.type === 'streamable'
          ? 'streamable'
          : body.type === 'invokable'
            ? 'invokable'
            : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      endpoint: body.endpoint === undefined ? undefined : (body.endpoint as any),
      parameters:
        body.parameters === undefined ? undefined : (body.parameters as any),
      responseTransform:
        body.response_transform === undefined && body.responseTransform === undefined
          ? undefined
          : ((body.response_transform ?? body.responseTransform) as any),
      rateLimit:
        body.rate_limit === undefined && body.rateLimit === undefined
          ? undefined
          : ((body.rate_limit ?? body.rateLimit) as any),
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      version: typeof body.version === 'string' ? body.version : undefined,
      tags: body.tags === undefined ? undefined : (body.tags as any),
    },
  })
  return ok(c, toSnakeCase(item))
})

toolsRouter.delete('/:id', async c => {
  await prisma.tool.delete({ where: { id: c.req.param('id') } })
  return ok(c, { deleted: true })
})
