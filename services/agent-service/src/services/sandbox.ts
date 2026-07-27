import { spawn, execSync } from 'child_process'
import { logger } from '../config/logger.js'

export interface SandboxResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

// 构造自定义环境变量，优先将 Docker 官方桌面版工具路径加入 PATH 以防 keychain 或 credential 软链接损坏
const customEnv = {
  ...process.env,
  PATH: `/Applications/Docker.app/Contents/Resources/bin:${process.env.PATH || ''}`
}

let dockerPath = 'docker'
try {
  // 必须真正执行命令以验证其可用性（防止 which 匹配到死链接）
  execSync('docker --version', { stdio: 'ignore', env: customEnv })
} catch {
  const candidates = [
    '/Applications/Docker.app/Contents/Resources/bin/docker',
    '/usr/local/bin/docker',
    '/opt/homebrew/bin/docker',
    '/usr/bin/docker',
  ]
  for (const c of candidates) {
    try {
      execSync(`${c} --version`, { stdio: 'ignore', env: customEnv })
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
  const image = language === 'javascript' ? 'node:20-alpine' : 'python:3.11-alpine'
  const command = language === 'javascript' ? 'node' : 'python'
  const args = language === 'javascript' ? [] : ['-']
  const containerName = `telos-code-sandbox-${language}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  const killContainer = () => {
    try {
      execSync(`${dockerPath} kill ${containerName}`, { stdio: 'ignore', env: customEnv })
    } catch {}
  }

  const dockerArgs = [
    'run',
    '-i',
    '--rm',
    '--name', containerName,
    '--network=none',
    '--memory=256m',
    '--cpus=0.5',
    image,
    command,
    ...args
  ]

  return new Promise((resolve) => {
    logger.info({ msg: `Spawning sandbox container for ${language}...` })

    const child = spawn(dockerPath, dockerArgs, {
      env: customEnv
    })
    
    let stdout = ''
    let stderr = ''
    let isFinished = false

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
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
        stdout,
        stderr: stderr + '\nExecution Timeout: Limit of 10s exceeded.',
        exitCode: -1
      })
    }, 10000)

    child.on('close', (code) => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)

      resolve({
        stdout,
        stderr,
        exitCode: code
      })
    })

    child.on('error', (err) => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)
      killContainer()

      resolve({
        stdout,
        stderr: stderr + `\nProcess error: ${err.message}`,
        exitCode: -2
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
        stdout,
        stderr: stderr + `\nFailed to write code to stdin: ${err.message}`,
        exitCode: -3
      })
    }
  })
}

import fs from 'fs'
import path from 'path'

// 检测 Docker 是否真正运行且可用
let isDockerReady = false
try {
  execSync(`${dockerPath} ps`, { stdio: 'ignore', env: customEnv })
  isDockerReady = true
} catch {
  isDockerReady = false
}

/**
 * 在挂载的工作空间 Docker 隔离沙箱中执行命令。如果 Docker 不可用，安全回退到宿主机执行。
 */
export async function executeWorkspaceCommand(
  threadId: string,
  command: string
): Promise<SandboxResult & { method: 'docker' | 'host'; timedOut?: boolean }> {
  // 1. threadId 正则强校验，彻底防御挂载路径穿越与参数注入
  if (!/^[a-zA-Z0-9_-]+$/.test(threadId)) {
    throw new Error(`Access denied: Invalid threadId format '${threadId}'`)
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
      '--name', containerName,
      '--network=none',
      '--memory=512m',
      '--cpus=1.0',
      '-v', `${hostWsPath}:${containerWsPath}`,
      '--workdir', containerWsPath,
      image,
      'sh', '-c', command
    ]

    return new Promise((resolve) => {
      logger.info({ msg: `Spawning workspace sandbox Docker for command execution`, threadId, command, containerName })
      const child = spawn(dockerPath, dockerArgs, { env: customEnv })
      let stdout = ''
      let stderr = ''
      let isFinished = false

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      const timeoutId = setTimeout(() => {
        if (isFinished) return
        isFinished = true
        
        // 彻底终结容器生命周期，解决孤儿容器无休止运行漏洞
        logger.warn({ msg: `Execution Timeout: Killing Docker container`, containerName })
        try {
          child.kill('SIGKILL')
        } catch {}
        try {
          execSync(`${dockerPath} kill ${containerName}`, { stdio: 'ignore', env: customEnv })
        } catch {}
        
        resolve({
          stdout,
          stderr: stderr + '\nExecution Timeout: Limit of 30s exceeded in Docker sandbox.',
          exitCode: -1,
          method: 'docker',
          timedOut: true
        })
      }, 30000)

      child.on('close', (code) => {
        if (isFinished) return
        isFinished = true
        clearTimeout(timeoutId)
        resolve({
          stdout,
          stderr,
          exitCode: code,
          method: 'docker'
        })
      })

      child.on('error', (err) => {
        if (isFinished) return
        isFinished = true
        clearTimeout(timeoutId)
        
        // 报错时同样尝试清理可能正在运行的容器
        try {
          execSync(`${dockerPath} kill ${containerName}`, { stdio: 'ignore', env: customEnv })
        } catch {}
        
        resolve({
          stdout,
          stderr: stderr + `\nSandbox daemon error: ${err.message}`,
          exitCode: -2,
          method: 'docker'
        })
      })
    })
  }

  // 降级回退到宿主机执行
  logger.warn({ msg: `Docker sandbox not available. Falling back to host execution for thread: ${threadId}`, command })
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      cwd: hostWsPath,
      env: customEnv
    })
    let stdout = ''
    let stderr = ''
    let isFinished = false

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    const timeoutId = setTimeout(() => {
      if (isFinished) return
      isFinished = true
      try {
        child.kill('SIGKILL')
      } catch {}
      resolve({
        stdout,
        stderr: stderr + '\nExecution Timeout: Limit of 30s exceeded on Host.',
        exitCode: -1,
        method: 'host',
        timedOut: true
      })
    }, 30000)

    child.on('close', (code) => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)
      const warning = stderr ? '\n' : '' + '[Security Warning: Docker sandbox is unavailable, command executed on host]\n'
      resolve({
        stdout,
        stderr: warning + stderr,
        exitCode: code,
        method: 'host'
      })
    })

    child.on('error', (err) => {
      if (isFinished) return
      isFinished = true
      clearTimeout(timeoutId)
      resolve({
        stdout,
        stderr: stderr + `\nHost spawn error: ${err.message}`,
        exitCode: -2,
        method: 'host'
      })
    })
  })
}
