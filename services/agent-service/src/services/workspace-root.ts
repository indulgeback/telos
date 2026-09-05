import path from 'node:path'

export function getPersistedWorkspaceRoot() {
  return path.resolve(
    process.env.WORKSPACE_PERSISTED_DIR ||
      path.join(process.cwd(), '.persisted-workspaces')
  )
}
