import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  openSharedFile,
  resolveSharedFilePath,
} from '../dist/services/workspace-share.js'
import {
  isAuthenticatedAdmin,
  isConfiguredAdminUser,
} from '../dist/middleware/gatewayIdentity.js'

test('admin checks fail closed without a configured identity', () => {
  assert.equal(isConfiguredAdminUser(null), false)
  assert.equal(isConfiguredAdminUser('not-configured'), false)
  assert.equal(
    isAuthenticatedAdmin({
      get(key) {
        return key === 'gatewayAuthenticated' ? true : 'not-configured'
      },
    }),
    false
  )
})

test('admin checks accept only an explicitly configured Gateway user', () => {
  const moduleUrl = pathToFileURL(
    path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../dist/middleware/gatewayIdentity.js'
    )
  ).href
  const script = `
    const auth = await import(${JSON.stringify(moduleUrl)})
    console.log(JSON.stringify([
      auth.isConfiguredAdminUser('admin-1'),
      auth.isConfiguredAdminUser('admin-2'),
    ]))
  `
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, AGENT_ADMIN_USER_IDS: 'admin-1' },
    }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout.trim().split('\n').pop()), [
    true,
    false,
  ])
})

test('shared file resolution rejects traversal, prefix collisions, and symlinks', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'telos-share-'))
  const workspace = path.join(root, 'workspace')
  const sibling = path.join(root, 'workspace-secret')
  fs.mkdirSync(workspace)
  fs.mkdirSync(sibling)
  fs.writeFileSync(path.join(workspace, 'ok.txt'), 'ok')
  fs.writeFileSync(path.join(sibling, 'secret.txt'), 'secret')

  assert.equal(
    await resolveSharedFilePath(workspace, 'ok.txt'),
    await fs.promises.realpath(path.join(workspace, 'ok.txt'))
  )
  const opened = await openSharedFile(workspace, 'ok.txt')
  try {
    assert.equal(await opened.fileHandle.readFile('utf8'), 'ok')
  } finally {
    await opened.fileHandle.close()
  }
  await assert.rejects(
    resolveSharedFilePath(workspace, '../workspace-secret/secret.txt')
  )

  const link = path.join(workspace, 'link.txt')
  fs.symlinkSync(path.join(sibling, 'secret.txt'), link)
  await assert.rejects(resolveSharedFilePath(workspace, 'link.txt'))

  fs.rmSync(root, { recursive: true, force: true })
})

test('COS workspace links are short-lived signed capabilities', () => {
  const moduleUrl = pathToFileURL(
    path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../dist/services/workspace.js'
    )
  ).href
  const script = `
    const { WorkspaceManager } = await import(${JSON.stringify(moduleUrl)})
    console.log(WorkspaceManager.getFileUrl('thread-1', 'report.pdf'))
  `
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        COS_SECRET_ID: 'test-secret-id',
        COS_SECRET_KEY: 'test-secret-key',
        COS_BUCKET: 'private-bucket-1234567890',
        COS_REGION: 'ap-shanghai',
        WORKSPACE_SHARE_URL_TTL_SECONDS: '300',
      },
    }
  )

  assert.equal(result.status, 0, result.stderr)
  const url = result.stdout.trim().split('\n').pop()
  assert.match(url, /^https:\/\//)
  assert.match(url, /q-sign-algorithm=/)
  assert.match(url, /q-sign-time=/)
})
