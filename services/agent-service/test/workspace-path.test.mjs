import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { WorkspaceManager } from '../dist/services/workspace.js'

test('workspace paths reject traversal and every symlink component', () => {
  const threadId = `workspace-path-${Date.now()}`
  const workspace = WorkspaceManager.ensureWorkspaceDir(threadId)
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'telos-outside-'))

  try {
    assert.throws(
      () => WorkspaceManager.resolvePath(threadId, '../../etc/passwd'),
      /outside the workspace/
    )

    fs.symlinkSync(outside, path.join(workspace, 'escape'), 'dir')
    assert.throws(
      () => WorkspaceManager.resolvePath(threadId, 'escape/new/file.txt'),
      /symbolic links/
    )

    fs.mkdirSync(path.join(workspace, 'safe'), { recursive: true })
    assert.equal(
      WorkspaceManager.resolvePath(threadId, 'safe/new/file.txt'),
      path.join(workspace, 'safe/new/file.txt')
    )
  } finally {
    WorkspaceManager.cleanupWorkspace(threadId)
    fs.rmSync(outside, { recursive: true, force: true })
  }
})
