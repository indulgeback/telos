import { spawn, execSync } from 'child_process'
import { logger } from '../config/logger.js'

export interface SandboxResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

// Docker CLI 只需要一个最小环境。不要把 agent-service 的完整环境（其中可能包含
// 数据库/API 密钥）传给执行子进程。
const executionEnv = {
  PATH: `/Applications/Docker.app/Contents/Resources/bin:${process.env.PATH || ''}`,
}

const MAX_SANDBOX_OUTPUT_BYTES = 1024 * 1024
const MAX_SANDBOX_CODE_BYTES = 256 * 1024
const MAX_WORKSPACE_COMMAND_BYTES = 16 * 1024
const sandboxUser =
  typeof process.getuid === 'function' && typeof process.getgid === 'function'
    ? `${process.getuid()}:${process.getgid()}`
    : '65534:65534'

interface OutputAccumulator {
  value: string
  bytes: number
  truncated: boolean
}

function appendSandboxOutput(target: OutputAccumulator, chunk: unknown) {
  if (target.truncated) return
  const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
  const remaining = MAX_SANDBOX_OUTPUT_BYTES - target.bytes
  if (data.byteLength <= remaining) {
    target.value += data.toString()
    target.bytes += data.byteLength
    return
  }
  target.value += data.subarray(0, Math.max(0, remaining)).toString()
  target.value += '\n...[sandbox output truncated]'
  target.bytes = MAX_SANDBOX_OUTPUT_BYTES
  target.truncated = true
}

let dockerPath = 'docker'
try {
  // 必须真正执行命令以验证其可用性（防止 which 匹配到死链接）
  execSync('docker --version', { stdio: 'ignore', env: executionEnv })
} catch {
  const candidates = [
    '/Applications/Docker.app/Contents/Resources/bin/docker',
    '/usr/local/bin/docker',
    '/opt/homebrew/bin/docker',
    '/usr/bin/docker',
  ]
  for (const c of candidates) {
    try {
      execSync(`${c} --version`, { stdio: 'ignore', env: executionEnv })
      dockerPath = c
      break
    } catch {}
  }
}

/**
 * 在隔离的 Docker alpine 容器中安全地执行代码
 */
export async function executeCode(
  code: string,
  language: 'javascript' | 'python'
): Promise<SandboxResult> {
  if (Buffer.byteLength(code, 'utf8') > MAX_SANDBOX_CODE_BYTES) {
    throw new Error('Code exceeds the sandbox input limit')
  }
  if (!isWorkspaceSandboxAvailable()) {
    throw new Error(
      'Code sandbox is unavailable; refusing to execute code without Docker isolation.'
    )
  }

  const image =
    language === 'javascript' ? 'node:20-alpine' : 'python:3.11-alpine'
  const command = language === 'javascript' ? 'node' : 'python'
  const args = language === 'javascript' ? [] : ['-']
  const containerName = `telos-code-sandbox-${language}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  const killContainer = () => {
    try {
      execSync(`${dockerPath} kill ${containerName}`, {
        stdio: 'ignore',
        env: executionEnv,
      })
    } catch {}
  }

  const dockerArgs = [
    'run',
    '-i',
    '--rm',
    '--name',
    containerName,
    '--network=none',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--pids-limit=64',
    '--user',
    sandboxUser,
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=64m',
    '--memory=256m',
    '--cpus=0.5',
    image,
    command,
    ...args,
  ]

  return new Promise(resolve => {
    logger.info({ msg: `Spawning sandbox container for ${language}...` })

    const child = spawn(dockerPath, dockerArgs, {
      env: executionEnv,
    })

    const stdout = { value: '', bytes: 0, truncated: false }
    const stderr = { value: '', bytes: 0, truncated: false }
    let isFinished = false

    child.stdout.on('data', data => {
      appendSandboxOutput(stdout, data)
    })

    child.stderr.on('data', data => {
      appendSandboxOutput(stderr, data)
    })

    // 设置 10 秒超时强制退出
    const timeoutId = setTimeout(() => {
      if (isFinished) return
      isFinished = true

      logger.warn({ msg: 'Sandbox execution timed out. Killing container...' })
      try {
        child.kill('SIGKILL')
      } catch {}
      killContainer()
      resolve({
        stdout: stdout.value,
        stderr: stderr.value + '\nExecution Timeout: Limit of 10s exceeded.',
        exitCode: -1,
      })
    }, 10000)

    child.on('close', code => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)

      resolve({
        stdout: stdout.value,
        stderr: stderr.value,
        exitCode: code,
      })
    })

    child.on('error', err => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)
      killContainer()

      resolve({
        stdout: stdout.value,
        stderr: stderr.value + `\nProcess error: ${err.message}`,
        exitCode: -2,
      })
    })

    // 输入用户的代码并关闭输入流
    try {
      child.stdin.write(code)
      child.stdin.end()
    } catch (err: any) {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)
      try {
        child.kill('SIGKILL')
      } catch {}
      killContainer()
      resolve({
        stdout: stdout.value,
        stderr:
          stderr.value + `\nFailed to write code to stdin: ${err.message}`,
        exitCode: -3,
      })
    }
  })
}

import fs from 'fs'
import path from 'path'

// 检测 Docker 是否真正运行且可用
let isDockerReady = false
try {
  // Sandbox execution is an explicit capability. The absence of an opt-in or
  // Docker is never a reason to execute on the host.
  if (process.env.SANDBOX_ENABLED === 'true') {
    execSync(`${dockerPath} ps`, { stdio: 'ignore', env: executionEnv })
    isDockerReady = true
  }
} catch {
  isDockerReady = false
}

/** Return whether the isolated workspace executor is currently available. */
export function isWorkspaceSandboxAvailable(): boolean {
  return isDockerReady
}

/**
 * 在挂载的工作空间 Docker 隔离沙箱中执行命令。
 *
 * Docker 不可用时必须拒绝执行；绝不能回退到宿主机 shell。
 */
export async function executeWorkspaceCommand(
  threadId: string,
  command: string
): Promise<SandboxResult & { method: 'docker'; timedOut?: boolean }> {
  // 1. threadId 正则强校验，彻底防御挂载路径穿越与参数注入
  if (!/^[a-zA-Z0-9_-]+$/.test(threadId)) {
    throw new Error(`Access denied: Invalid threadId format '${threadId}'`)
  }
  if (Buffer.byteLength(command, 'utf8') > MAX_WORKSPACE_COMMAND_BYTES) {
    throw new Error('Workspace command exceeds the sandbox input limit')
  }

  if (!isDockerReady) {
    throw new Error(
      'Workspace sandbox is unavailable; refusing to execute command without Docker isolation.'
    )
  }

  const hostWsPath = path.join('/tmp', 'telos-workspaces', threadId)
  if (!fs.existsSync(hostWsPath)) {
    fs.mkdirSync(hostWsPath, { recursive: true })
  }

  if (isDockerReady) {
    const image = 'node:20-alpine'
    const containerWsPath = '/workspace'
    const containerName = `telos-sandbox-${threadId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const dockerArgs = [
      'run',
      '-i',
      '--rm',
      '--name',
      containerName,
      '--network=none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--pids-limit=64',
      '--user',
      sandboxUser,
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,nodev,size=128m',
      '--memory=512m',
      '--cpus=1.0',
      '-v',
      `${hostWsPath}:${containerWsPath}`,
      '--workdir',
      containerWsPath,
      image,
      'sh',
      '-c',
      command,
    ]

    return new Promise(resolve => {
      logger.info({
        msg: 'Spawning workspace sandbox Docker for command execution',
        threadId,
        containerName,
      })
      const child = spawn(dockerPath, dockerArgs, { env: executionEnv })
      const stdout = { value: '', bytes: 0, truncated: false }
      const stderr = { value: '', bytes: 0, truncated: false }
      let isFinished = false

      child.stdout.on('data', data => {
        appendSandboxOutput(stdout, data)
      })

      child.stderr.on('data', data => {
        appendSandboxOutput(stderr, data)
      })

      const timeoutId = setTimeout(() => {
        if (isFinished) return
        isFinished = true

        // 彻底终结容器生命周期，解决孤儿容器无休止运行漏洞
        logger.warn({
          msg: `Execution Timeout: Killing Docker container`,
          containerName,
        })
        try {
          child.kill('SIGKILL')
        } catch {}
        try {
          execSync(`${dockerPath} kill ${containerName}`, {
            stdio: 'ignore',
            env: executionEnv,
          })
        } catch {}

        resolve({
          stdout: stdout.value,
          stderr:
            stderr.value +
            '\nExecution Timeout: Limit of 30s exceeded in Docker sandbox.',
          exitCode: -1,
          method: 'docker',
          timedOut: true,
        })
      }, 30000)

      child.on('close', code => {
        if (isFinished) return
        isFinished = true
        clearTimeout(timeoutId)
        resolve({
          stdout: stdout.value,
          stderr: stderr.value,
          exitCode: code,
          method: 'docker',
        })
      })

      child.on('error', err => {
        if (isFinished) return
        isFinished = true
        clearTimeout(timeoutId)

        // 报错时同样尝试清理可能正在运行的容器
        try {
          execSync(`${dockerPath} kill ${containerName}`, {
            stdio: 'ignore',
            env: executionEnv,
          })
        } catch {}

        resolve({
          stdout: stdout.value,
          stderr: stderr.value + `\nSandbox daemon error: ${err.message}`,
          exitCode: -2,
          method: 'docker',
        })
      })
    })
  }

  // Kept as a final guard in case the availability state changes while this
  // function is being refactored; no host execution fallback is permitted.
  throw new Error(
    'Workspace sandbox is unavailable; refusing to execute command without Docker isolation.'
  )
}
