import fs from 'node:fs'
import path from 'node:path'

export class SharedPathAccessError extends Error {
  constructor() {
    super('Shared file is outside the workspace root')
    this.name = 'SharedPathAccessError'
  }
}

function assertContainedPath(realRoot: string, candidate: string) {
  const relativeToRoot = path.relative(realRoot, candidate)

  if (
    !relativeToRoot ||
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new SharedPathAccessError()
  }
}

export async function resolveSharedFilePath(
  workspaceRoot: string,
  requestedPath: string
) {
  const realRoot = await fs.promises.realpath(workspaceRoot)
  const realFilePath = await fs.promises.realpath(
    path.resolve(workspaceRoot, requestedPath)
  )
  // path.relative avoids both prefix collisions (root-a vs root-ab) and
  // symlink escapes. An empty relative path is the workspace directory.
  assertContainedPath(realRoot, realFilePath)

  return realFilePath
}

/**
 * Open first, then validate the identity of the already-open file. On Linux,
 * /proc/self/fd resolves the object held by the descriptor, closing the
 * parent-directory symlink race between realpath() and open(). Once validated,
 * later renames cannot retarget the descriptor.
 */
export async function openSharedFile(
  workspaceRoot: string,
  requestedPath: string
) {
  const realRoot = await fs.promises.realpath(workspaceRoot)
  const initialPath = await resolveSharedFilePath(workspaceRoot, requestedPath)
  const fileHandle = await fs.promises.open(
    initialPath,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)
  )

  try {
    const stat = await fileHandle.stat()
    if (!stat.isFile()) throw new SharedPathAccessError()

    let openedPath = initialPath
    if (process.platform === 'linux') {
      openedPath = await fs.promises.realpath(`/proc/self/fd/${fileHandle.fd}`)
      assertContainedPath(realRoot, openedPath)
    } else {
      // Development fallback for platforms without /proc. The production
      // deployment is Linux; compare the opened inode with a fresh path stat
      // so ordinary replacements are still rejected locally.
      const latestPath = await fs.promises.realpath(initialPath)
      assertContainedPath(realRoot, latestPath)
      const latestStat = await fs.promises.stat(latestPath)
      if (latestStat.dev !== stat.dev || latestStat.ino !== stat.ino) {
        throw new SharedPathAccessError()
      }
      openedPath = latestPath
    }

    return { fileHandle, realFilePath: openedPath, stat }
  } catch (error) {
    await fileHandle.close().catch(() => undefined)
    throw error
  }
}
