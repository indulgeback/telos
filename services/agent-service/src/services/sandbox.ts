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

  const dockerArgs = [
    'run',
    '-i',
    '--rm',
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
      resolve({
        stdout,
        stderr: stderr + `\nFailed to write code to stdin: ${err.message}`,
        exitCode: -3
      })
    }
  })
}
