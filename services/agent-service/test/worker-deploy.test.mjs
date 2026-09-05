import test from 'node:test'
import assert from 'node:assert/strict'
import { chmod, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceDeploy = new URL('../../../deploy/deploy.sh', import.meta.url)

async function fixture({
  migrateFail = false,
  healthFail = false,
  oldManifest = false,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'telos-deploy-test-'))
  const deploy = join(root, 'deploy')
  const bin = join(root, 'bin')
  await mkdir(join(deploy, 'backups', 'release-prev'), { recursive: true })
  await mkdir(bin)
  await writeFile(join(deploy, 'deploy.sh'), await readFile(sourceDeploy))
  await chmod(join(deploy, 'deploy.sh'), 0o755)
  await writeFile(
    join(root, 'docker-compose.prod.yml'),
    'services:\n  agent-worker:\n'
  )
  await writeFile(
    join(deploy, 'backups', 'release-prev', 'docker-compose.prod.yml'),
    oldManifest
      ? 'services:\n  agent-service:\n'
      : 'services:\n  agent-worker:\n'
  )
  await writeFile(
    join(root, '.env'),
    [
      'IMAGE_TAG=fixture',
      'IMAGE_OWNER=fixture',
      'POSTGRES_PASSWORD=p',
      'BETTER_AUTH_SECRET=s',
      'BETTER_AUTH_URL=https://example.test',
      'NEXT_PUBLIC_API_URL=https://api.example.test',
      'GATEWAY_INTERNAL_SECRET=g',
      'WORKSPACE_SHARE_BASE_URL=https://api.example.test',
      'BACKUP_DATABASE=false',
      'CLEAN_IMAGES=false',
    ].join('\n') + '\n'
  )
  const log = join(root, 'docker.log')
  await writeFile(log, '')
  const fake = join(bin, 'docker')
  await writeFile(
    fake,
    `#!/usr/bin/env node
const fs = require('node:fs')
const a = process.argv.slice(2)
const s = a.join(' ')
fs.appendFileSync(process.env.FAKE_LOG, s + '\\n')
if (a[0] === 'compose' && a[1] === 'version') process.exit(0)
if (a[0] === 'compose' && a.includes('--services')) {
  process.stdout.write(s.includes('release-prev') && process.env.FAKE_OLD_MANIFEST === 'true' ? 'agent-service\\n' : 'consul\\npostgres\\nredis\\nregistry\\napi-gateway\\nagent-service\\nagent-worker\\nadmin-service\\nweb\\nadmin\\n')
  process.exit(0)
}
if (a[0] === 'compose' && a.includes('ps') && (a.includes('-q') || a.includes('-aq'))) {
  const service = a.at(-1)
  process.stdout.write(service === 'agent-worker' ? 'worker-old-1\\n' : service + '-id\\n')
  process.exit(0)
}
if (a[0] === 'compose' && a.includes('exec') && s.includes('psql')) {
  if (s.includes('to_regclass')) process.stdout.write(s.includes('agent_run_attempts') ? 'ok\\n' : 'false\\n')
  else process.stdout.write('0\\n')
  process.exit(0)
}
if (a[0] === 'compose' && a.includes('run') && process.env.FAKE_MIGRATE_FAIL === 'true') process.exit(1)
if (a[0] === 'inspect') {
  const target = a.at(-1)
  if (target === 'telos-agent-service' && s.includes('State.Running')) process.stdout.write('true\\n')
  else if (target === 'telos-postgres') process.stdout.write('healthy\\n')
  else if (process.env.FAKE_HEALTH_FAIL === 'true' && (target === 'agent-worker-id' || target === 'worker-old-1')) process.stdout.write('unhealthy\\n')
  else process.stdout.write('healthy\\n')
  process.exit(0)
}
if (a[0] === 'cp' && a[1].startsWith('telos-agent-service:')) fs.writeFileSync(require('node:path').join(a[2], 'legacy.txt'), 'saved artifact')
if (a[0] === 'exec' && s.includes('test -d')) process.exit(0)
if (a[0] === 'exec' && s.includes('pg_dump')) { process.stdout.write('fixture dump\\n'); process.exit(0) }
if (a[0] === 'images' || a[0] === 'ps') process.exit(0)
process.exit(0)
`
  )
  await chmod(fake, 0o755)
  return {
    root,
    deploy,
    log,
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_LOG: log,
      FAKE_MIGRATE_FAIL: String(migrateFail),
      FAKE_HEALTH_FAIL: String(healthFail),
      FAKE_OLD_MANIFEST: String(oldManifest),
      HEALTH_TIMEOUT: '1',
      HEALTH_INTERVAL: '1',
      PREVIOUS_RELEASE_BACKUP_DIR: join(deploy, 'backups', 'release-prev'),
    },
  }
}

async function runCase(options) {
  const f = await fixture(options)
  const result = spawnSync('bash', [join(f.deploy, 'deploy.sh')], {
    cwd: f.root,
    env: { ...process.env, ...f.env },
    encoding: 'utf8',
    timeout: 20_000,
  })
  return { ...f, result, log: await readFile(f.log, 'utf8') }
}

test('deploy stops API and worker and migrates legacy workspace', async () => {
  const r = await runCase()
  assert.equal(r.result.status, 0, r.result.stderr)
  assert.match(r.log, /compose .* stop agent-service agent-worker/)
  assert.equal(
    await readFile(join(r.root, 'workspaces', 'legacy.txt'), 'utf8'),
    'saved artifact'
  )
  assert.equal(
    await readFile(join(r.root, 'workspaces', '.migration-complete'), 'utf8'),
    ''
  )
  assert(
    r.log.indexOf('stop agent-service agent-worker') <
      r.log.indexOf('run --rm --no-deps agent-service')
  )
  assert.match(r.log, /cp telos-agent-service:\/app\/\.persisted-workspaces\//)
  assert.match(r.log, /compose .* run --rm --no-deps agent-service/)
})

test('migration failure restarts the captured old API and worker', async () => {
  const r = await runCase({ migrateFail: true })
  assert.notEqual(r.result.status, 0)
  assert.match(r.log, /start worker-old-1/)
  assert.match(r.log, /start telos-agent-service/)
})

test('health failure rolls back using a previous manifest without a worker', async () => {
  const r = await runCase({ healthFail: true, oldManifest: true })
  assert.notEqual(r.result.status, 0)
  assert.match(
    r.log,
    /compose .*backups\/release-prev\/docker-compose\.prod\.yml up -d --remove-orphans/
  )
  assert.match(
    r.log,
    /cp .*workspaces\/.+telos-agent-service:\/app\/\.persisted-workspaces/
  )
})
