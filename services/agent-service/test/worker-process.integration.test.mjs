import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

const databaseUrl = process.env.TELOS_PROCESS_TEST_DATABASE_URL?.trim()
const redisUrl = process.env.TELOS_PROCESS_TEST_REDIS_URL?.trim()
const isolatedDatabase = databaseUrl
  ? /telos[-_]worker[-_]test/i.test(new URL(databaseUrl).pathname)
  : false
const enabled = Boolean(databaseUrl && redisUrl && isolatedDatabase)

if (databaseUrl && redisUrl && !isolatedDatabase) {
  throw new Error(
    'TELOS_PROCESS_TEST_DATABASE_URL must name an isolated telos_worker_test database'
  )
}

// Prisma reads DATABASE_URL during module initialization. Bind the explicitly
// supplied fixture URLs before the guarded dynamic imports below; never fall
// back to a developer or deployment DATABASE_URL for this test.
if (enabled) {
  process.env.DATABASE_URL = databaseUrl
  process.env.REDIS_URL = redisUrl
  process.env.NODE_ENV = 'test'
}

const childEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl || '',
  REDIS_URL: redisUrl || '',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
}

function runChild(source, timeoutMs = 15_000, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--input-type=module', '-e', source],
      {
        cwd: new URL('../', import.meta.url),
        env: { ...childEnv, ...extraEnv },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`child timed out; stdout=${stdout}; stderr=${stderr}`))
    }, timeoutMs)
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    child.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(
          new Error(
            `child exited ${code ?? signal}; stdout=${stdout}; stderr=${stderr}`
          )
        )
        return
      }
      const resultLine = stdout
        .split('\n')
        .find(line => line.startsWith('__RESULT__'))
      resolve(
        resultLine ? JSON.parse(resultLine.slice('__RESULT__'.length)) : null
      )
    })
  })
}

async function createFixture(prisma) {
  const suffix = randomUUID()
  const user = await prisma.user.create({
    data: {
      id: `fixture-user-${suffix}`,
      email: `fixture-${suffix}@example.test`,
      name: 'worker process fixture',
    },
  })
  const agent = await prisma.agent.create({
    data: {
      name: `worker-process-${suffix}`,
      description: 'worker process integration fixture',
      ownerId: user.id,
    },
  })
  const thread = await prisma.agentThread.create({
    data: {
      agentId: agent.id,
      ownerId: user.id,
      title: 'worker process integration fixture',
    },
  })
  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      threadId: thread.id,
      input: { input: 'fixture' },
    },
  })
  return {
    userId: user.id,
    agentId: agent.id,
    threadId: thread.id,
    runId: run.id,
  }
}

async function cleanupFixture(prisma, fixture) {
  await prisma.user
    .delete({ where: { id: fixture.userId } })
    .catch(() => undefined)
}

const producerSource = `
  const { enqueueAgentRun, closeAgentRunQueue } = await import('./dist/services/run-queue.js')
  const { prisma } = await import('./dist/services/db.js')
  try {
    await enqueueAgentRun({ runId: process.env.FIXTURE_RUN_ID })
    console.log('__RESULT__' + JSON.stringify({ enqueued: true }))
  } finally {
    await closeAgentRunQueue()
    await prisma.$disconnect()
  }
`

const workerSource = `
  const { Worker } = await import('bullmq')
  const { QUEUE_NAME, buildRedisConnectionOptions } = await import('./dist/services/run-queue.js')
  const { claimRunLease } = await import('./dist/services/run-lease.js')
  const { prisma } = await import('./dist/services/db.js')
  if (process.env.FIXTURE_DIRECT_CLAIM === 'true') {
    const lease = await claimRunLease(process.env.FIXTURE_RUN_ID, 'fixture-worker-' + process.pid)
    console.log('__RESULT__' + JSON.stringify({ runId: process.env.FIXTURE_RUN_ID, claimed: Boolean(lease), attempt: lease?.attempt ?? null }))
    await prisma.$disconnect()
    process.exit(0)
  }
  const worker = new Worker(QUEUE_NAME, async job => {
    const lease = await claimRunLease(job.data.runId, 'fixture-worker-' + process.pid)
    console.log('__RESULT__' + JSON.stringify({ runId: job.data.runId, claimed: Boolean(lease), attempt: lease?.attempt ?? null }))
  }, { connection: buildRedisConnectionOptions(), concurrency: 1 })
  worker.on('error', error => { console.error(error); process.exitCode = 1 })
  await new Promise((resolve, reject) => {
    worker.once('completed', resolve)
    worker.once('failed', reject)
  })
  await worker.close()
  await prisma.$disconnect()
`

describe('durable worker process boundary', { skip: !enabled }, () => {
  it('enqueues in one process and claims exactly once in two workers', async () => {
    const { prisma } = await import('../dist/services/db.js')
    const { enqueueAgentRun, closeAgentRunQueue } =
      await import('../dist/services/run-queue.js')
    const { claimRunLease } = await import('../dist/services/run-lease.js')
    const fixture = await createFixture(prisma)
    try {
      await runChild(
        producerSource.replaceAll(
          'process.env.FIXTURE_RUN_ID',
          JSON.stringify(fixture.runId)
        )
      )
      const first = await runChild(workerSource)
      const second = await runChild(
        workerSource.replaceAll(
          'process.env.FIXTURE_RUN_ID',
          JSON.stringify(fixture.runId)
        ),
        15_000,
        { FIXTURE_DIRECT_CLAIM: 'true' }
      )
      assert.equal(first?.claimed, true)
      assert.equal(second?.claimed, false)
      assert.equal(first?.runId, fixture.runId)
      assert.equal(second?.runId, fixture.runId)
      const run = await prisma.agentRun.findUnique({
        where: { id: fixture.runId },
      })
      const attempts = await prisma.agentRunAttempt.findMany({
        where: { runId: fixture.runId },
      })
      assert.equal(run?.status, 'running')
      assert.equal(attempts.length, 1)
      assert.equal(await claimRunLease(fixture.runId, 'parent-duplicate'), null)
    } finally {
      await closeAgentRunQueue()
      await cleanupFixture(prisma, fixture)
      await prisma.$disconnect()
    }
  })

  it('keeps cancellation authoritative across a separate worker process', async () => {
    const { prisma } = await import('../dist/services/db.js')
    const { enqueueAgentRun, getAgentRunQueue, closeAgentRunQueue } =
      await import('../dist/services/run-queue.js')
    const fixture = await createFixture(prisma)
    try {
      await enqueueAgentRun({ runId: fixture.runId })
      // Model the authoritative part of cancellation directly in the fixture
      // DB. The public cancel path also writes a Redis marker, whose singleton
      // client is owned by the service runtime and intentionally has no test
      // shutdown API; avoiding it keeps this process test handle-free.
      await prisma.agentRun.update({
        where: { id: fixture.runId },
        data: {
          status: 'cancelled',
          error: 'fixture cancellation',
          completedAt: new Date(),
        },
      })
      const result = await runChild(
        workerSource.replaceAll(
          'process.env.FIXTURE_RUN_ID',
          JSON.stringify(fixture.runId)
        ),
        15_000,
        { FIXTURE_DIRECT_CLAIM: 'true' }
      )
      assert.equal(result?.claimed, false)
      const run = await prisma.agentRun.findUnique({
        where: { id: fixture.runId },
      })
      const attempts = await prisma.agentRunAttempt.findMany({
        where: { runId: fixture.runId },
      })
      assert.equal(run?.status, 'cancelled')
      assert.equal(attempts.length, 0)
      const job = await getAgentRunQueue().getJob(fixture.runId)
      await job?.remove()
    } finally {
      await closeAgentRunQueue()
      await cleanupFixture(prisma, fixture)
      await prisma.$disconnect()
    }
  })
})
