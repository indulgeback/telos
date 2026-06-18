import test from 'node:test'
import assert from 'node:assert'
import { executeCode } from '../dist/services/sandbox.js'

test('Docker Sandbox Execution - JavaScript', async () => {
  const code = 'console.log("Hello from Sandbox " + (1 + 2));'
  const result = await executeCode(code, 'javascript')
  
  assert.strictEqual(result.exitCode, 0)
  assert.strictEqual(result.stdout.trim(), 'Hello from Sandbox 3')
  assert.strictEqual(result.stderr.trim(), '')
})

test('Docker Sandbox Execution - Python', async () => {
  const code = 'print("Hello from Python", 10 + 20)'
  const result = await executeCode(code, 'python')
  
  assert.strictEqual(result.exitCode, 0)
  assert.strictEqual(result.stdout.trim(), 'Hello from Python 30')
  assert.strictEqual(result.stderr.trim(), '')
})

test('Docker Sandbox Execution - Network Blocked', async () => {
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
  assert.ok(result.stderr.includes('ENOTFOUND') || result.stderr.includes('EAI_AGAIN') || result.stderr.includes('Error'))
})

test('Docker Sandbox Execution - Timeout', async () => {
  // 运行一个死循环，确认在 10s 后被超时终止
  const code = 'while(true){}'
  const result = await executeCode(code, 'javascript')
  
  assert.strictEqual(result.exitCode, -1)
  assert.ok(result.stderr.includes('Execution Timeout: Limit of 10s exceeded.'))
})
