import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { WorkspaceManager, virtualReaddir } from '../dist/services/workspace.js'
import { isReadOnlyTool } from '../dist/services/plan-tools.js'

test('Workspace Management - Local simulation and caching', async () => {
  const threadId = 'test-thread-123-' + Date.now()
  const localWorkspacePath = WorkspaceManager.getWorkspacePath(threadId)
  
  // 1. 获取 StorageProvider 实例，本地模拟下默认是 LocalStorageProvider
  const provider = WorkspaceManager.getProvider()
  assert.ok(provider, 'Storage provider should be initialized')

  // 2. 模拟云端放入文件
  const cloudKey = `workspaces/${threadId}/src/index.ts`
  const mockPersistedDir = path.resolve(process.cwd(), '.persisted-workspaces')
  const mockCloudFilePath = path.join(mockPersistedDir, cloudKey)
  
  fs.mkdirSync(path.dirname(mockCloudFilePath), { recursive: true })
  fs.writeFileSync(mockCloudFilePath, 'console.log("hello world");\n// line 2\n// line 3', 'utf-8')

  // 3. 验证 ensureFileCached 懒加载
  const cachedLocalPath = await WorkspaceManager.ensureFileCached(threadId, 'src/index.ts')
  assert.ok(cachedLocalPath, 'File should be downloaded')
  assert.ok(fs.existsSync(cachedLocalPath), 'Cached file should exist in local temp workspace')
  assert.strictEqual(
    fs.readFileSync(cachedLocalPath, 'utf-8'),
    'console.log("hello world");\n// line 2\n// line 3'
  )

  // 4. 模拟写入本地新文件并直传同步云端
  const newLocalFileRelative = 'docs/readme.md'
  const newLocalFileAbsolute = path.join(localWorkspacePath, newLocalFileRelative)
  
  fs.mkdirSync(path.dirname(newLocalFileAbsolute), { recursive: true })
  fs.writeFileSync(newLocalFileAbsolute, '# README', 'utf-8')

  const syncResult = await WorkspaceManager.syncFileToCloud(threadId, newLocalFileRelative)
  assert.ok(syncResult, 'Sync file to cloud should succeed')
  
  // 验证云端是否存在对应的同步文件
  const expectedCloudPath = path.join(mockPersistedDir, `workspaces/${threadId}/docs/readme.md`)
  assert.ok(fs.existsSync(expectedCloudPath), 'File should be synced back to the persisted storage')
  assert.strictEqual(fs.readFileSync(expectedCloudPath, 'utf-8'), '# README')

  // 5. 路径越界验证 (resolvePath)
  WorkspaceManager.resolvePath(threadId, 'src/index.ts') // 应该成功
  assert.throws(() => {
    WorkspaceManager.resolvePath(threadId, '../outside.ts')
  }, /Access denied/, 'Access to parent path should be denied')

  // 6. 测试虚拟 readdir
  const fileList = [
    'src/index.ts',
    'src/components/button.tsx',
    'package.json',
    'tsconfig.json'
  ]
  const rootReaddir = virtualReaddir(fileList, '')
  assert.deepStrictEqual(rootReaddir, [
    { name: 'src', isDirectory: true },
    { name: 'package.json', isDirectory: false },
    { name: 'tsconfig.json', isDirectory: false }
  ])

  const srcReaddir = virtualReaddir(fileList, 'src')
  assert.deepStrictEqual(srcReaddir, [
    { name: 'index.ts', isDirectory: false },
    { name: 'components', isDirectory: true }
  ])

  // 7. 清理 Workspace
  WorkspaceManager.cleanupWorkspace(threadId)
  assert.ok(!fs.existsSync(localWorkspacePath), 'Local workspace temp folder should be destroyed')

  // 清除模拟云端残留
  try {
    fs.rmSync(path.join(mockPersistedDir, `workspaces/${threadId}`), { recursive: true, force: true })
  } catch (err) {}
})

test('Plan Mode Security - isReadOnlyTool Whitelist', () => {
  // 只读工具
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'get_current_time' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'calculator' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'search_memory' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'list_directory' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'view_file' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'grep_search' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'file_search' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'code_interpreter' } }))
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'web_search' } }))
  
  // 只读 HTTP GET
  assert.ok(isReadOnlyTool({ endpoint: { kind: 'http', method: 'GET', urlTemplate: 'http://foo' } }))

  // 禁用的写和运行工具
  assert.ok(!isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'write_file' } }))
  assert.ok(!isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'patch_file' } }))
  assert.ok(!isReadOnlyTool({ endpoint: { kind: 'builtin', builtin: 'run_command' } }))
  assert.ok(!isReadOnlyTool({ endpoint: { kind: 'http', method: 'POST', urlTemplate: 'http://foo' } }))
})
