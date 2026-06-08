import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { created, fail, ok, parseJson } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'

export const skillsRouter = new Hono()

skillsRouter.get('/', async c => {
  const skills = await prisma.skill.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(c, toSnakeCase(skills))
})

skillsRouter.post('/', async c => {
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

  const skill = await prisma.skill.create({
    data: {
      name,
      description,
      content,
      enabled: body.enabled !== false,
      metadata: (body.metadata ?? {}) as any,
    },
  })
  return created(c, toSnakeCase(skill))
})

skillsRouter.get('/:id', async c => {
  const skill = await prisma.skill.findUnique({
    where: { id: c.req.param('id') },
  })
  if (!skill) return fail(c, 404, 'Skill not found')
  return ok(c, toSnakeCase(skill))
})

skillsRouter.put('/:id', async c => {
  const body = await parseJson(c)
  const skill = await prisma.skill.update({
    where: { id: c.req.param('id') },
    data: {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
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

skillsRouter.delete('/:id', async c => {
  await prisma.skill.delete({ where: { id: c.req.param('id') } })
  return ok(c, { deleted: true })
})
