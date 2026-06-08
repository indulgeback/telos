import {
  MCPServerSSE,
  MCPServerStdio,
  MCPServerStreamableHttp,
  createMCPToolStaticFilter,
} from '@openai/agents'
import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { created, fail, ok, parseJson } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'
import { asRecord, asStringArray } from '../utils/json.js'

export const mcpRouter = new Hono()

function resolveEnv(envConfig: unknown): Record<string, string> {
  const env = asRecord(envConfig)
  const resolved: Record<string, string> = {}
  Object.entries(env).forEach(([key, value]) => {
    if (typeof value === 'string') resolved[key] = process.env[value] ?? ''
  })
  return resolved
}

function buildServer(raw: any) {
  const toolFilter = createMCPToolStaticFilter({
    allowed: asStringArray(raw.allowedTools),
  })
  if (raw.transport === 'stdio') {
    return new MCPServerStdio({
      name: raw.name,
      command: raw.command,
      args: asStringArray(raw.args),
      env: resolveEnv(raw.env),
      toolFilter,
      cacheToolsList: false,
      timeout: 15000,
    })
  }
  if (raw.transport === 'streamable_http') {
    return new MCPServerStreamableHttp({
      name: raw.name,
      url: raw.url,
      toolFilter,
      cacheToolsList: false,
      timeout: 15000,
    })
  }
  return new MCPServerSSE({
    name: raw.name,
    url: raw.url,
    toolFilter,
    cacheToolsList: false,
    timeout: 15000,
  })
}

mcpRouter.get('/', async c => {
  const servers = await prisma.mcpServer.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return ok(c, toSnakeCase(servers))
})

mcpRouter.post('/', async c => {
  const body = await parseJson(c)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description =
    typeof body.description === 'string' ? body.description.trim() : ''
  if (!name || !description) {
    return fail(c, 400, 'name and description are required')
  }
  const transport =
    body.transport === 'stdio' || body.transport === 'sse'
      ? body.transport
      : 'streamable_http'
  const server = await prisma.mcpServer.create({
    data: {
      name,
      description,
      transport,
      command: typeof body.command === 'string' ? body.command : null,
      args: (body.args ?? []) as any,
      url: typeof body.url === 'string' ? body.url : null,
      env: (body.env ?? {}) as any,
      allowedTools: (body.allowed_tools ?? body.allowedTools ?? []) as any,
      approvalPolicy:
        body.approval_policy === 'all' || body.approvalPolicy === 'all'
          ? 'all'
          : body.approval_policy === 'sensitive' ||
              body.approvalPolicy === 'sensitive'
            ? 'sensitive'
            : 'none',
      enabled: body.enabled !== false,
      metadata: (body.metadata ?? {}) as any,
    },
  })
  return created(c, toSnakeCase(server))
})

mcpRouter.get('/:id', async c => {
  const server = await prisma.mcpServer.findUnique({
    where: { id: c.req.param('id') },
  })
  if (!server) return fail(c, 404, 'MCP server not found')
  return ok(c, toSnakeCase(server))
})

mcpRouter.put('/:id', async c => {
  const body = await parseJson(c)
  const server = await prisma.mcpServer.update({
    where: { id: c.req.param('id') },
    data: {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : undefined,
      transport:
        body.transport === 'stdio' ||
        body.transport === 'sse' ||
        body.transport === 'streamable_http'
          ? body.transport
          : undefined,
      command: typeof body.command === 'string' ? body.command : undefined,
      args: body.args === undefined ? undefined : (body.args as any),
      url: typeof body.url === 'string' ? body.url : undefined,
      env: body.env === undefined ? undefined : (body.env as any),
      allowedTools:
        body.allowed_tools === undefined && body.allowedTools === undefined
          ? undefined
          : ((body.allowed_tools ?? body.allowedTools) as any),
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      metadata: body.metadata === undefined ? undefined : (body.metadata as any),
    },
  })
  return ok(c, toSnakeCase(server))
})

mcpRouter.delete('/:id', async c => {
  await prisma.mcpServer.delete({ where: { id: c.req.param('id') } })
  return ok(c, { deleted: true })
})

mcpRouter.post('/:id/test', async c => {
  const server = await prisma.mcpServer.findUnique({
    where: { id: c.req.param('id') },
  })
  if (!server) return fail(c, 404, 'MCP server not found')

  const runtimeServer = buildServer(server)
  const tools = await runtimeServer.listTools()
  await prisma.mcpServer.update({
    where: { id: server.id },
    data: {
      lastToolsSnapshot: tools as any,
      lastConnectedAt: new Date(),
    },
  })
  return ok(c, { tools })
})
