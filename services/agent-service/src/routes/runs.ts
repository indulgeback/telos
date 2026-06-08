import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { fail, ok } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'

export const runsRouter = new Hono()

runsRouter.get('/:id', async c => {
  const userId = getCurrentUserId(c)
  const run = await prisma.agentRun.findFirst({
    where: {
      id: c.req.param('id'),
      thread: { ownerId: userId },
    },
    include: {
      agent: true,
      steps: { orderBy: { index: 'asc' } },
    },
  })
  if (!run) return fail(c, 404, 'Run not found')
  return ok(c, toSnakeCase(run))
})

runsRouter.get('/:id/events', async c => {
  const userId = getCurrentUserId(c)
  const run = await prisma.agentRun.findFirst({
    where: {
      id: c.req.param('id'),
      thread: { ownerId: userId },
    },
    select: { id: true },
  })
  if (!run) return fail(c, 404, 'Run not found')
  const events = await prisma.agentRunEvent.findMany({
    where: { runId: c.req.param('id') },
    orderBy: { sequence: 'asc' },
  })
  return ok(c, toSnakeCase(events))
})
