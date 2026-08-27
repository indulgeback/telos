import fs from 'fs'
import path from 'path'
import COS from 'cos-nodejs-sdk-v5'
import { logger } from '../config/logger.js'
import { config } from '../config/index.js'

export interface StorageProvider {
  downloadFile(key: string, localFilePath: string): Promise<boolean>
  uploadFile(key: string, localFilePath: string): Promise<boolean>
  listFiles(prefix: string): Promise<string[]>
}

// 根据扩展名推断 MIME 类型，避免 COS 上传后文件被当成 application/octet-stream
// 导致 xlsx/docx/pptx/pdf/图片等无法在云端预览或被办公软件正确加载
const MIME_BY_EXT: Record<string, string> = {
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv; charset=utf-8',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_BY_EXT[ext] || 'application/octet-stream'
}

// 判断是否为浏览器可内联展示的类型（图片/pdf/文本等），这些不强制下载
function isInlineType(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.pdf',
    '.txt',
    '.md',
    '.html',
    '.json',
    '.csv',
  ].includes(ext)
}

export class CosStorageProvider implements StorageProvider {
  private cos: COS
  private bucket: string
  private region: string

  constructor(
    secretId: string,
    secretKey: string,
    bucket: string,
    region: string
  ) {
    this.cos = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    })
    this.bucket = bucket
    this.region = region
  }

  async downloadFile(key: string, localFilePath: string): Promise<boolean> {
    return new Promise(resolve => {
      const dir = path.dirname(localFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      this.cos.getObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Output: fs.createWriteStream(localFilePath),
        },
        err => {
          if (err) {
            logger.error({ msg: 'Failed to download file from COS', key, err })
            resolve(false)
          } else {
            resolve(true)
          }
        }
      )
    })
  }

  async uploadFile(key: string, localFilePath: string): Promise<boolean> {
    return new Promise(resolve => {
      const fileName = path.basename(localFilePath)
      const contentType = getContentType(localFilePath)
      const inline = isInlineType(localFilePath)
      // 关键：设置 Content-Type，避免 xlsx/docx/pptx 被当成 octet-stream
      // 设置 Content-Disposition，让浏览器下载时文件名不乱码（RFC 5987 编码中文文件名）
      // 图片/pdf/text 用 inline，其余（office 文档）用 attachment + force-download
      const dispositionValue = inline
        ? `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
        : `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`

      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          ACL: 'private',
          Body: fs.createReadStream(localFilePath),
          ContentLength: fs.statSync(localFilePath).size,
          Headers: {
            'Content-Type': contentType,
            'Content-Disposition': dispositionValue,
          },
        },
        err => {
          if (err) {
            logger.error({ msg: 'Failed to upload file to COS', key, err })
            resolve(false)
          } else {
            resolve(true)
          }
        }
      )
    })
  }

  async listFiles(prefix: string): Promise<string[]> {
    return new Promise(resolve => {
      this.cos.getBucket(
        {
          Bucket: this.bucket,
          Region: this.region,
          Prefix: prefix,
        },
        (err, data) => {
          if (err) {
            logger.error({ msg: 'Failed to list files from COS', prefix, err })
            resolve([])
          } else {
            const files = (data?.Contents || []).map((item: any) => item.Key)
            resolve(files)
          }
        }
      )
    })
  }
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
  }

  async downloadFile(key: string, localFilePath: string): Promise<boolean> {
    const sourcePath = path.join(this.baseDir, key)
    if (!fs.existsSync(sourcePath)) {
      return false
    }
    const dir = path.dirname(localFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.copyFileSync(sourcePath, localFilePath)
    return true
  }

  async uploadFile(key: string, localFilePath: string): Promise<boolean> {
    const targetPath = path.join(this.baseDir, key)
    const dir = path.dirname(targetPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.copyFileSync(localFilePath, targetPath)
    return true
  }

  async listFiles(prefix: string): Promise<string[]> {
    const targetDir = path.join(this.baseDir, prefix)
    if (!fs.existsSync(targetDir)) {
      return []
    }

    const results: string[] = []
    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scan(fullPath)
        } else {
          const relKey = path.relative(this.baseDir, fullPath)
          results.push(relKey)
        }
      }
    }

    // 如果 targetDir 也是一个文件，直接返回它
    const stat = fs.statSync(targetDir)
    if (stat.isFile()) {
      results.push(prefix)
    } else {
      scan(targetDir)
    }

    return results.filter(k => k.startsWith(prefix))
  }
}

export class WorkspaceManager {
  private static provider: StorageProvider | null = null

  static getProvider(): StorageProvider {
    if (this.provider) return this.provider

    // 如果处于测试模式，强制使用 LocalStorageProvider
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.TAP === '1' ||
      process.env.NODE_TEST_CONTEXT
    ) {
      const persistedDir = path.resolve(process.cwd(), '.persisted-workspaces')
      logger.info({
        msg: 'Test environment detected. Forcing LocalStorageProvider',
        path: persistedDir,
      })
      this.provider = new LocalStorageProvider(persistedDir)
      return this.provider
    }

    const secretId = process.env.COS_SECRET_ID
    const secretKey = process.env.COS_SECRET_KEY
    const bucket = process.env.COS_BUCKET
    const region = process.env.COS_REGION

    if (secretId && secretKey && bucket && region) {
      logger.info('Initializing CosStorageProvider for WorkspaceManager')
      this.provider = new CosStorageProvider(
        secretId,
        secretKey,
        bucket,
        region
      )
    } else {
      const persistedDir = path.resolve(process.cwd(), '.persisted-workspaces')
      logger.info({
        msg: 'Initializing LocalStorageProvider for WorkspaceManager',
        path: persistedDir,
      })
      this.provider = new LocalStorageProvider(persistedDir)
    }
    return this.provider
  }

  static getWorkspacePath(threadId: string): string {
    return path.join('/tmp', 'telos-workspaces', threadId)
  }

  static ensureWorkspaceDir(threadId: string): string {
    const localDir = this.getWorkspacePath(threadId)
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }
    return localDir
  }

  static async ensureFileCached(
    threadId: string,
    relativePath: string
  ): Promise<string | null> {
    const localFilePath = this.resolvePath(threadId, relativePath)

    const release = await FileMutex.acquire(localFilePath)
    try {
      if (fs.existsSync(localFilePath)) {
        return localFilePath
      }

      const provider = this.getProvider()
      const cloudKey = `workspaces/${threadId}/${relativePath}`
      const ok = await provider.downloadFile(cloudKey, localFilePath)
      if (ok) {
        // Revalidate after the provider created the file. This rejects a
        // symlink inserted while the download was in flight.
        return this.resolvePath(threadId, relativePath)
      }
      return null
    } finally {
      release()
    }
  }

  static async syncFileToCloud(
    threadId: string,
    relativePath: string
  ): Promise<boolean> {
    const localFilePath = this.resolvePath(threadId, relativePath)

    const release = await FileMutex.acquire(localFilePath)
    try {
      if (!fs.existsSync(localFilePath)) {
        return false
      }

      const provider = this.getProvider()
      const cloudKey = `workspaces/${threadId}/${relativePath}`
      return await provider.uploadFile(cloudKey, localFilePath)
    } finally {
      release()
    }
  }

  static async listFiles(
    threadId: string,
    relativePrefix: string = ''
  ): Promise<string[]> {
    const provider = this.getProvider()
    const cloudPrefix = `workspaces/${threadId}/${relativePrefix}`
    const keys = await provider.listFiles(cloudPrefix)
    const prefixToRemove = `workspaces/${threadId}/`
    return keys.map(key => {
      if (key.startsWith(prefixToRemove)) {
        return key.slice(prefixToRemove.length)
      }
      return key
    })
  }

  /**
   * 确保指定 thread 的所有纯文本代码文件都已经下载缓存到本地
   */
  static async ensureAllFilesCached(threadId: string): Promise<void> {
    const files = await this.listFiles(threadId)
    const filterOut = (file: string) => {
      const parts = file.split('/')
      return (
        parts.includes('node_modules') ||
        parts.includes('.git') ||
        parts.includes('dist') ||
        parts.includes('.persisted-workspaces') ||
        parts.includes('.workspaces')
      )
    }

    const codeFiles = files.filter(f => !filterOut(f))
    for (const file of codeFiles) {
      await this.ensureFileCached(threadId, file)
    }
  }

  static cleanupWorkspace(threadId: string): void {
    const localDir = this.getWorkspacePath(threadId)
    if (fs.existsSync(localDir)) {
      try {
        fs.rmSync(localDir, { recursive: true, force: true })
        logger.info({
          msg: 'Cleaned up local workspace for thread',
          threadId,
          path: localDir,
        })
      } catch (err) {
        logger.error({
          msg: 'Failed to cleanup workspace',
          threadId,
          path: localDir,
          err,
        })
      }
    }
  }

  static resolvePath(threadId: string, inputPath: string): string {
    if (inputPath.includes('\0')) {
      throw new Error('Access denied: workspace paths cannot contain NUL bytes')
    }

    const wsRoot = path.resolve(this.ensureWorkspaceDir(threadId))
    const realWsRoot = fs.realpathSync(wsRoot)
    const resolved = path.resolve(wsRoot, inputPath)

    const relative = path.relative(wsRoot, resolved)
    if (
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new Error(
        `Access denied: path '${inputPath}' is outside the workspace root '${wsRoot}'`
      )
    }

    // Reject every existing symlink component, not only the final target. A
    // sandbox can create `link/new/file` where `link` points outside the host
    // workspace; checking only the nearest parent misses that escape.
    let current = realWsRoot
    for (const segment of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, segment)
      try {
        const stat = fs.lstatSync(current)
        if (stat.isSymbolicLink()) {
          throw new Error(
            `Access denied: symbolic links are not allowed in workspace paths ('${inputPath}')`
          )
        }
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          break
        }
        throw error
      }
    }
    return resolved
  }

  static getFileUrl(threadId: string, relativePath: string): string {
    const secretId = process.env.COS_SECRET_ID
    const secretKey = process.env.COS_SECRET_KEY
    const bucket = process.env.COS_BUCKET
    const region = process.env.COS_REGION

    const normalizedRelPath = relativePath.replace(/\\/g, '/')
    // 对路径的每一段做 URL 编码（保留 /），避免中文文件名在 URL 里裸字符
    // 导致部分客户端解析失败或显示成 %E4%B8%80... 乱码
    const encodedPath = normalizedRelPath
      .split('/')
      .map(seg => encodeURIComponent(seg))
      .join('/')

    if (secretId && secretKey && bucket && region) {
      const cos = new COS({ SecretId: secretId, SecretKey: secretKey })
      return cos.getObjectUrl({
        Bucket: bucket,
        Region: region,
        Key: `workspaces/${threadId}/${normalizedRelPath}`,
        Method: 'GET',
        Sign: true,
        Expires: config.workspaceShareUrlTtlSeconds,
        Protocol: 'https:',
      })
    } else {
      const shareBaseUrl = config.workspaceShareBaseUrl.replace(/\/$/, '')
      return `${shareBaseUrl}/workspaces/shares/${threadId}/${encodedPath}`
    }
  }
}

/**
 * 虚拟 readdir，根据扁平的相对路径文件数组，解析出某级目录下的子项和是否是目录
 */
export function virtualReaddir(
  files: string[],
  relativeDir: string
): { name: string; isDirectory: boolean }[] {
  const normalizedDir = relativeDir.replace(/^\/+|\/+$/g, '')
  const set = new Set<string>()
  const result: { name: string; isDirectory: boolean }[] = []

  for (const file of files) {
    const normalizedFile = file.replace(/^\/+|\/+$/g, '')
    if (normalizedDir === '') {
      const parts = normalizedFile.split('/')
      const name = parts[0]
      const isDirectory = parts.length > 1
      const key = `${name}:${isDirectory}`
      if (name && !set.has(key)) {
        set.add(key)
        result.push({ name, isDirectory })
      }
    } else if (normalizedFile.startsWith(normalizedDir + '/')) {
      const subPath = normalizedFile.slice(normalizedDir.length + 1)
      const parts = subPath.split('/')
      const name = parts[0]
      const isDirectory = parts.length > 1
      const key = `${name}:${isDirectory}`
      if (name && !set.has(key)) {
        set.add(key)
        result.push({ name, isDirectory })
      }
    }
  }

  return result
}

/**
 * 极轻量的文件并发排他锁，防御同一物理文件写入竞争导致的损坏
 */
class FileMutex {
  private static readonly locks = new Map<string, Promise<void>>()

  public static async acquire(filePath: string): Promise<() => void> {
    const activeLock = this.locks.get(filePath) || Promise.resolve()
    let releaseLock: () => void = () => {}

    const newLock = new Promise<void>(resolve => {
      releaseLock = () => {
        resolve()
      }
    })

    const queuedLock = activeLock.then(() => newLock)
    this.locks.set(filePath, queuedLock)

    await activeLock
    return () => {
      releaseLock()
      if (this.locks.get(filePath) === queuedLock) {
        this.locks.delete(filePath)
      }
    }
  }
}
