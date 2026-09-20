import { it } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID, createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const database = process.env.TELOS_PROCESS_TEST_DATABASE_URL
const redis = process.env.TELOS_PROCESS_TEST_REDIS_URL
const enabled = Boolean(database && redis)
if (enabled && !new URL(database).pathname.includes('telos_worker_test')) {
  throw new Error('Use an isolated telos_worker_test database')
}

async function until(check, label, timeout = 20_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const result = await check()
    if (result) return result
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error(`Timed out: ${label}`)
}

it(
  'real API restart leaves a separate worker run alive; worker drains on SIGTERM',
  { skip: !enabled, timeout: 60_000 },
  async () => {
    process.env.DATABASE_URL = database
    process.env.REDIS_URL = redis
    process.env.NODE_ENV = 'test'
    process.env.LOG_LEVEL = 'silent'
    const { prisma } = await import('../dist/services/db.js')
    const { enqueueAgentRun, closeAgentRunQueue, getAgentRunQueue } =
      await import('../dist/services/run-queue.js')
    const workspace = await mkdtemp(join(tmpdir(), 'telos-worker-files-'))
    const pending = []
    const model = createServer((req, res) => {
      req.resume()
      req.on('end', () => pending.push(res))
    })
    model.listen(0, '127.0.0.1')
    await once(model, 'listening')
    const modelUrl = `http://127.0.0.1:${model.address().port}/v1`
    // Fixed test-only ports are overrideable for concurrent CI executors.
    const apiPort = Number(process.env.TELOS_TEST_API_PORT || 58895)
    const workerPort = Number(process.env.TELOS_TEST_WORKER_PORT || 58896)
    const env = {
      PATH: process.env.PATH,
      WORKSPACE_PERSISTED_DIR: workspace,
      DATABASE_URL: database,
      REDIS_URL: redis,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      PORT: String(apiPort),
      WORKER_HEALTH_PORT: String(workerPort),
      WORKER_SHUTDOWN_TIMEOUT_MS: '10000',
      SHORTAPI_API_KEY: 'local-test-only',
      SHORTAPI_BASE_URL: modelUrl,
      REGISTRY_URL: 'http://127.0.0.1:1',
      OPENAI_AGENTS_DISABLE_TRACING: '1',
    }
    const children = []
    function start(file) {
      const child = spawn(process.execPath, [file], {
        cwd: new URL('../', import.meta.url),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      child.logs = ''
      child.stdout.on('data', chunk => {
        child.logs += chunk
      })
      child.stderr.on('data', chunk => {
        child.logs += chunk
      })
      children.push(child)
      return child
    }
    async function ready(port, child) {
      await until(async () => {
        if (child.exitCode !== null) throw new Error(child.logs)
        try {
          return (await fetch(`http://127.0.0.1:${port}/ready`)).ok
        } catch {
          return false
        }
      }, `ready ${port}`)
    }
    function finishModel() {
      for (const res of pending.splice(0)) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        for (const [delta, finish_reason] of [
          [{ role: 'assistant', content: 'fixture complete' }, null],
          [{}, 'stop'],
        ]) {
          res.write(
            `data: ${JSON.stringify({ id: 'chatcmpl-fixture', object: 'chat.completion.chunk', created: 1, model: 'openai/gpt-5.5', choices: [{ index: 0, delta, finish_reason }] })}\n\n`
          )
        }
        res.end('data: [DONE]\n\n')
      }
    }
    let agent
    let user
    try {
      let api = start('dist/index.js')
      await ready(apiPort, api)
      const worker = start('dist/worker.js')
      await ready(workerPort, worker)
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          name: 'runtime fixture',
          email: `${randomUUID()}@example.test`,
        },
      })
      agent = await prisma.agent.create({
        data: {
          name: `runtime-${randomUUID()}`,
          description: 'fixture',
          modelKey: 'openai/gpt-5.5',
          instructions: 'Reply with a short sentence.',
          ownerId: user.id,
        },
      })
      const thread = await prisma.agentThread.create({
        data: { agentId: agent.id, ownerId: user.id, title: 'runtime fixture' },
      })
      const run = await prisma.agentRun.create({
        data: {
          agentId: agent.id,
          threadId: thread.id,
          input: { input: 'hello', model: 'openai/gpt-5.5' },
        },
      })
      await enqueueAgentRun({ runId: run.id })
      await until(() => pending.length > 0, 'worker model request')
      assert.equal(
        (await prisma.agentRun.findUnique({ where: { id: run.id } })).status,
        'running'
      )
      const apiExit = once(api, 'exit')
      api.kill('SIGTERM')
      assert.equal((await apiExit)[0], 0)
      assert.equal(
        (await prisma.agentRun.findUnique({ where: { id: run.id } })).status,
        'running'
      )
      api = start('dist/index.js')
      await ready(apiPort, api)
      // Termination must drain the current request rather than kill its task.
      const workerExit = once(worker, 'exit')
      worker.kill('SIGTERM')
      finishModel()
      const done = await until(async () => {
        const current = await prisma.agentRun.findUnique({
          where: { id: run.id },
        })
        return ['completed', 'failed', 'cancelled'].includes(current.status)
          ? current
          : false
      }, 'terminal run')
      assert.equal(done.status, 'completed', done.error || worker.logs)
      assert.match(done.finalOutput, /fixture complete/)
      assert.equal((await workerExit)[0], 0, worker.logs)
      const { signGatewayIdentity } =
        await import('../dist/middleware/gatewayIdentity.js')
      const fileDir = join(workspace, 'workspaces', thread.id)
      await mkdir(fileDir, { recursive: true })
      await writeFile(join(fileDir, 'result.txt'), 'shared worker artifact')
      const target = `/workspaces/shares/${thread.id}/result.txt`
      const timestamp = String(Math.floor(Date.now() / 1000))
      const nonce = randomUUID().replaceAll('-', '')
      const bodyDigest = createHash('sha256').update('').digest('hex')
      const signature = signGatewayIdentity({
        method: 'GET',
        path: target,
        query: '',
        bodyDigest,
        userId: user.id,
        timestamp,
        nonce,
      })
      const artifact = await fetch(`http://127.0.0.1:${apiPort}${target}`, {
        headers: {
          'X-User-ID': user.id,
          'X-Gateway-Timestamp': timestamp,
          'X-Gateway-Nonce': nonce,
          'X-Gateway-Body-SHA256': bodyDigest,
          'X-Gateway-Signature': signature,
        },
      })
      assert.equal(artifact.status, 200)
      assert.equal(await artifact.text(), 'shared worker artifact')
      assert.equal(
        await prisma.agentRunAttempt.count({ where: { runId: run.id } }),
        1
      )
      // API remains ready with no local worker; new work can queue safely.
      assert.equal(
        (await fetch(`http://127.0.0.1:${apiPort}/ready`)).status,
        200
      )
      const nextWorker = start('dist/worker.js')
      await ready(workerPort, nextWorker)
      const cancelledRun = await prisma.agentRun.create({
        data: {
          agentId: agent.id,
          threadId: thread.id,
          input: { input: 'cancel me', model: 'openai/gpt-5.5' },
        },
      })
      await enqueueAgentRun({ runId: cancelledRun.id })
      await until(() => pending.length > 0, 'second worker model request')
      const cancellation = spawn(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
      const { cancelAgentRun, closeAgentRunQueue } = await import('./dist/services/run-queue.js');
      const { prisma } = await import('./dist/services/db.js');
      const cancelled = await cancelAgentRun(${JSON.stringify(cancelledRun.id)}, 'process test');
      await closeAgentRunQueue(); await prisma.$disconnect(); process.exit(cancelled ? 0 : 1);
    `,
        ],
        { cwd: new URL('../', import.meta.url), env, stdio: 'ignore' }
      )
      assert.equal((await once(cancellation, 'exit'))[0], 0)
      await until(async () => {
        const job = await getAgentRunQueue().getJob(cancelledRun.id)
        return job && ['completed', 'failed'].includes(await job.getState())
      }, 'distributed cancellation stops execution')
      assert.equal(
        (await prisma.agentRun.findUnique({ where: { id: cancelledRun.id } }))
          .status,
        'cancelled'
      )
    } finally {
      finishModel()
      for (const child of children)
        if (child.exitCode === null) {
          const exited = once(child, 'exit')
          child.kill('SIGTERM')
          const timer = setTimeout(() => child.kill('SIGKILL'), 12_000)
          await exited
          clearTimeout(timer)
        }
      model.closeAllConnections()
      await new Promise(resolve => model.close(resolve))
      await closeAgentRunQueue()
      if (agent) await prisma.agent.delete({ where: { id: agent.id } })
      if (user) await prisma.user.delete({ where: { id: user.id } })
      await prisma.$disconnect()
      await rm(workspace, { recursive: true, force: true })
    }
  }
)
