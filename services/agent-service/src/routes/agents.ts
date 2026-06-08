import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { config } from '../config/index.js'
import { created, fail, ok, parseJson } from '../http/response.js'
import {
  serializeAgent,
  serializeAgents,
  toSnakeCase,
} from '../utils/serializer.js'
import { asStringArray } from '../utils/json.js'
import { createAgentRun } from '../services/persistence.js'
import { agentSessionService } from '../services/session.js'
import { agentRuntimeService } from '../services/runtime.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import {
  attachBuiltinToolsToAgent,
  ensureBuiltinTools,
} from '../services/builtin-tools.js'

export const agentsRouter = new Hono()

function normalizeAgentType(value: unknown): 'public' | 'private' | 'system' {
  return value === 'private' || value === 'system' ? value : 'public'
}

function normalizeLoopMode(value: unknown): 'auto' | 'single_turn' {
  return value === 'single_turn' ? 'single_turn' : 'auto'
}

function normalizeStatus(value: unknown): 'active' | 'archived' | 'disabled' {
  if (value === 'archived' || value === 'disabled') return value
  return 'active'
}

function normalizeReasoningEffort(value: unknown) {
  if (
    value === 'minimal' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high'
  ) {
    return value
  }
  return null
}

async function replaceBindings(
  agentId: string,
  ids: string[],
  modelName: 'agentSkill' | 'agentTool' | 'agentMcpServer',
  fieldName: 'skillId' | 'toolId' | 'mcpServerId'
) {
  const model = (prisma as any)[modelName]
  await model.deleteMany({ where: { agentId } })
  if (!ids.length) return
  await model.createMany({
    data: ids.map((id, index) => ({
      agentId,
      [fieldName]: id,
      enabled: true,
      sortOrder: index,
    })),
    skipDuplicates: true,
  })
}

agentsRouter.get('/', async c => {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return ok(c, serializeAgents(agents))
})

agentsRouter.get('/default', async c => {
  const agent = await prisma.agent.findFirst({
    where: { isDefault: true, status: 'active' },
  })
  if (!agent) return fail(c, 404, '默认 Agent 不存在')
  return ok(c, serializeAgent(agent))
})

agentsRouter.post('/', async c => {
  const body = await parseJson(c)
  const userId = getCurrentUserId(c)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description =
    typeof body.description === 'string' ? body.description.trim() : ''

  if (!name || !description) {
    return fail(c, 400, 'Agent name and description are required')
  }

  const agent = await prisma.agent.create({
    data: {
      name,
      description,
      instructions:
        typeof body.instructions === 'string' ? body.instructions : description,
      type: normalizeAgentType(body.type),
      modelKey:
        typeof body.modelKey === 'string' && body.modelKey.trim()
          ? body.modelKey.trim()
          : config.defaultModel,
      temperature:
        typeof body.temperature === 'number' ? body.temperature : 0.7,
      maxTurns: typeof body.maxTurns === 'number' ? body.maxTurns : 8,
      loopMode: normalizeLoopMode(body.loopMode),
      status: normalizeStatus(body.status),
      ownerId: userId,
      metadata: (body.metadata ?? {}) as any,
      isDefault: Boolean(body.isDefault),
    },
  })
  await ensureBuiltinTools()
  await attachBuiltinToolsToAgent(agent.id)

  return created(c, serializeAgent(agent))
})

agentsRouter.get('/:id', async c => {
  const agent = await prisma.agent.findUnique({
    where: { id: c.req.param('id') },
    include: {
      skillsAsAgent: {
        include: { skill: true },
        orderBy: { sortOrder: 'asc' },
      },
      toolsAsAgent: { include: { tool: true } },
      mcpServersAsAgent: { include: { mcpServer: true } },
      subagentsAsParent: {
        include: { subagent: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  if (!agent) return fail(c, 404, 'Agent 不存在')
  return ok(c, toSnakeCase(agent))
})

agentsRouter.put('/:id', async c => {
  const body = await parseJson(c)
  const agent = await prisma.agent.update({
    where: { id: c.req.param('id') },
    data: {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : undefined,
      instructions:
        typeof body.instructions === 'string' ? body.instructions : undefined,
      type:
        typeof body.type === 'string'
          ? normalizeAgentType(body.type)
          : undefined,
      modelKey:
        typeof body.modelKey === 'string' && body.modelKey.trim()
          ? body.modelKey.trim()
          : undefined,
      temperature:
        typeof body.temperature === 'number' ? body.temperature : undefined,
      maxTurns: typeof body.maxTurns === 'number' ? body.maxTurns : undefined,
      loopMode:
        typeof body.loopMode === 'string'
          ? normalizeLoopMode(body.loopMode)
          : undefined,
      status:
        typeof body.status === 'string'
          ? normalizeStatus(body.status)
          : undefined,
      metadata:
        body.metadata === undefined ? undefined : (body.metadata as any),
      isDefault:
        typeof body.isDefault === 'boolean' ? body.isDefault : undefined,
    },
  })
  return ok(c, serializeAgent(agent))
})

agentsRouter.delete('/:id', async c => {
  await prisma.agent.delete({ where: { id: c.req.param('id') } })
  return ok(c, { deleted: true })
})

agentsRouter.get('/:id/skills', async c => {
  const rows = await prisma.agentSkill.findMany({
    where: { agentId: c.req.param('id') },
    include: { skill: true },
    orderBy: { sortOrder: 'asc' },
  })
  return ok(c, { skills: toSnakeCase(rows) })
})

agentsRouter.put('/:id/skills', async c => {
  const body = await parseJson(c)
  await replaceBindings(
    c.req.param('id'),
    asStringArray(body.skill_ids ?? body.skillIds),
    'agentSkill',
    'skillId'
  )
  return ok(c, { message: 'skills configured' })
})

agentsRouter.get('/:id/tools', async c => {
  const rows = await prisma.agentTool.findMany({
    where: { agentId: c.req.param('id') },
    include: { tool: true },
  })
  return ok(c, { tools: toSnakeCase(rows) })
})

agentsRouter.put('/:id/tools', async c => {
  const body = await parseJson(c)
  await replaceBindings(
    c.req.param('id'),
    asStringArray(body.tool_ids ?? body.toolIds),
    'agentTool',
    'toolId'
  )
  return ok(c, { message: 'tools configured' })
})

agentsRouter.patch('/:id/tools/:toolId/toggle', async c => {
  const body = await parseJson(c)
  await prisma.agentTool.updateMany({
    where: { agentId: c.req.param('id'), toolId: c.req.param('toolId') },
    data: { enabled: Boolean(body.enabled) },
  })
  return ok(c, { message: 'tool toggled' })
})

agentsRouter.get('/:id/mcp-servers', async c => {
  const rows = await prisma.agentMcpServer.findMany({
    where: { agentId: c.req.param('id') },
    include: { mcpServer: true },
  })
  return ok(c, { mcp_servers: toSnakeCase(rows) })
})

agentsRouter.put('/:id/mcp-servers', async c => {
  const body = await parseJson(c)
  await replaceBindings(
    c.req.param('id'),
    asStringArray(body.mcp_server_ids ?? body.mcpServerIds),
    'agentMcpServer',
    'mcpServerId'
  )
  return ok(c, { message: 'mcp servers configured' })
})

agentsRouter.get('/:id/subagents', async c => {
  const rows = await prisma.agentRelation.findMany({
    where: { parentId: c.req.param('id') },
    include: { subagent: true },
    orderBy: { sortOrder: 'asc' },
  })
  return ok(c, { subagents: toSnakeCase(rows) })
})

agentsRouter.put('/:id/subagents', async c => {
  const body = await parseJson(c)
  const parentId = c.req.param('id')
  const relations = Array.isArray(body.relations) ? body.relations : []

  await prisma.agentRelation.deleteMany({ where: { parentId } })
  for (let index = 0; index < relations.length; index += 1) {
    const relation = relations[index] as Record<string, unknown>
    const subagentId =
      typeof relation.subagent_id === 'string'
        ? relation.subagent_id
        : typeof relation.subagentId === 'string'
          ? relation.subagentId
          : ''
    if (!subagentId || subagentId === parentId) continue

    await prisma.agentRelation.create({
      data: {
        parentId,
        subagentId,
        mode: relation.mode === 'handoff' ? 'handoff' : 'as_tool',
        name: typeof relation.name === 'string' ? relation.name : null,
        description:
          typeof relation.description === 'string'
            ? relation.description
            : 'Specialist subagent',
        sortOrder: index,
        enabled: relation.enabled !== false,
        metadata: (relation.metadata ?? {}) as any,
      },
    })
  }

  return ok(c, { message: 'subagents configured' })
})

agentsRouter.post('/:id/runs', async c => {
  const body = await parseJson(c)
  const input = typeof body.input === 'string' ? body.input.trim() : ''
  if (!input) return fail(c, 400, 'input is required')
  const agentId = c.req.param('id')
  const ownerId = getCurrentUserId(c)
  const thread = await agentSessionService.ensureThread({
    agentId,
    threadId: typeof body.threadId === 'string' ? body.threadId : null,
    ownerId,
    firstInput: input,
    metadata: { source: 'run_api' },
  })
  const userMessage = await agentSessionService.appendUserMessage(
    thread.id,
    input
  )
  const runtimeContext = await agentSessionService.buildRuntimeInput(thread.id)

  const run = await createAgentRun({
    agentId,
    threadId: thread.id,
    input: { input },
    metadata: { source: 'run_api', userMessageId: userMessage.id },
  })

  if (body.stream === true) {
    const { createAgentStreamResponse } = await import('./chat.js')
    return createAgentStreamResponse(c, {
      agentId: c.req.param('id'),
      runId: run.id,
      input,
      threadId: thread.id,
      ownerId,
      runtimeInput: runtimeContext.input,
      memoryInstructions: runtimeContext.memoryInstructions,
      modelOverride:
        typeof body.model === 'string' && body.model.trim()
          ? body.model.trim()
          : null,
      reasoningEffort: normalizeReasoningEffort(body.reasoningEffort),
    })
  }

  const { result, persistence } = await agentRuntimeService.run(
    agentId,
    {
      runId: run.id,
      input: runtimeContext.input,
      threadId: thread.id,
      memoryInstructions: runtimeContext.memoryInstructions,
      modelOverride:
        typeof body.model === 'string' && body.model.trim()
          ? body.model.trim()
          : null,
      reasoningEffort: normalizeReasoningEffort(body.reasoningEffort),
    }
  )
  await persistence.complete(
    String(result.finalOutput ?? ''),
    result.lastAgent?.name,
    result.lastResponseId
  )
  await agentSessionService.appendAssistantMessage(
    thread.id,
    run.id,
    String(result.finalOutput ?? '')
  )
  agentSessionService.scheduleSummaries(thread.id, agentId, ownerId)

  return ok(c, { run_id: run.id, thread_id: thread.id, status: 'completed' })
})
