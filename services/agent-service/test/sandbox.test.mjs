import test from 'node:test'
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { executeCode } from '../dist/services/sandbox.js'

// 这些是集成测试, 需要真实 Docker 环境 (拉取 python/node 镜像执行代码)
// CI 环境 (无 SANDBOX_ENABLED=true) 自动跳过, 避免基础检查变慢/失败
// 本地启用: SANDBOX_ENABLED=true pnpm test
const sandboxEnabled = process.env.SANDBOX_ENABLED === 'true'
const skipReason = '需要 Docker 环境 (集成测试, 设 SANDBOX_ENABLED=true 启用)'

test('Workspace command refuses execution when sandbox is unavailable', async () => {
  const sandboxUrl = pathToFileURL(
    path.resolve('dist/services/sandbox.js')
  ).href
  const child = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { executeWorkspaceCommand } from '${sandboxUrl}';
try {
  await executeWorkspaceCommand('sandbox-test', 'printf SHOULD_NOT_RUN');
  console.log('executed');
  process.exit(3);
} catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
}`,
    ],
    {
      env: { PATH: process.env.PATH || '', SANDBOX_ENABLED: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', data => {
    stdout += data.toString()
  })
  child.stderr.on('data', data => {
    stderr += data.toString()
  })
  const [exitCode] = await new Promise(resolve =>
    child.once('close', (...args) => resolve(args))
  )

  assert.strictEqual(exitCode, 0, stderr)
  assert.match(stdout, /refusing to execute command/i)
  assert.doesNotMatch(stdout, /executed/)
})

test('Code interpreter refuses execution when sandbox is unavailable', async () => {
  const sandboxUrl = pathToFileURL(
    path.resolve('dist/services/sandbox.js')
  ).href
  const child = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { executeCode } from '${sandboxUrl}';
try {
  await executeCode('console.log("SHOULD_NOT_RUN")', 'javascript');
  console.log('executed');
  process.exit(3);
} catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
}`,
    ],
    {
      env: { PATH: process.env.PATH || '', SANDBOX_ENABLED: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', data => {
    stdout += data.toString()
  })
  child.stderr.on('data', data => {
    stderr += data.toString()
  })
  const [exitCode] = await new Promise(resolve =>
    child.once('close', (...args) => resolve(args))
  )

  assert.strictEqual(exitCode, 0, stderr)
  assert.match(stdout, /refusing to execute code/i)
  assert.doesNotMatch(stdout, /executed/)
  assert.doesNotMatch(stdout, /SHOULD_NOT_RUN/)
})

test(
  'Docker Sandbox Execution - JavaScript',
  { skip: !sandboxEnabled ? skipReason : undefined },
  async () => {
    const code = 'console.log("Hello from Sandbox " + (1 + 2));'
    const result = await executeCode(code, 'javascript')

    assert.strictEqual(result.exitCode, 0)
    assert.strictEqual(result.stdout.trim(), 'Hello from Sandbox 3')
    assert.strictEqual(result.stderr.trim(), '')
  }
)

test(
  'Docker Sandbox Execution - Python',
  { skip: !sandboxEnabled ? skipReason : undefined },
  async () => {
    const code = 'print("Hello from Python", 10 + 20)'
    const result = await executeCode(code, 'python')

    assert.strictEqual(result.exitCode, 0)
    assert.strictEqual(result.stdout.trim(), 'Hello from Python 30')
    assert.strictEqual(result.stderr.trim(), '')
  }
)

test(
  'Docker Sandbox Execution - Network Blocked',
  { skip: !sandboxEnabled ? skipReason : undefined },
  async () => {
    // 试图通过 JavaScript 访问网络，应该由于 --network=none 遭到拦截
    const code = `
    const http = await import('http').catch(() => null);
    if (!http) {
      console.error('http module load failed');
      process.exit(2);
    }
    http.get('http://www.google.com', (res) => {
      console.log('Success');
      process.exit(0);
    }).on('error', (e) => {
      console.error('Error: ' + e.message);
      process.exit(1);
    });
  `
    const result = await executeCode(code, 'javascript')
    assert.strictEqual(result.exitCode, 1)
    assert.ok(
      result.stderr.includes('ENOTFOUND') ||
        result.stderr.includes('EAI_AGAIN') ||
        result.stderr.includes('Error')
    )
  }
)

test(
  'Docker Sandbox Execution - Timeout',
  { skip: !sandboxEnabled ? skipReason : undefined },
  async () => {
    // 运行一个死循环，确认在 10s 后被超时终止
    const code = 'while(true){}'
    const result = await executeCode(code, 'javascript')

    assert.strictEqual(result.exitCode, -1)
    assert.ok(
      result.stderr.includes('Execution Timeout: Limit of 10s exceeded.')
    )
  }
)
