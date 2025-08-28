#!/usr/bin/env node

/**
 * 开发环境快速设置脚本
 * 帮助开发者快速设置 Google OAuth 开发环境
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

function logHeader(message) {
  log(`\n${colors.bold}${message}${colors.reset}`, 'blue')
}

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// 异步问题函数
function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve)
  })
}

// 生成安全密钥
function generateSecretKey() {
  return crypto.randomBytes(32).toString('base64')
}

// 检查是否已有配置文件
function checkExistingConfig() {
  const envPath = path.join(__dirname, '../.env.local')
  return fs.existsSync(envPath)
}

// 读取现有配置
function readExistingConfig() {
  const envPath = path.join(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) return {}

  const envContent = fs.readFileSync(envPath, 'utf8')
  const config = {}

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      config[key.trim()] = value.trim().replace(/['"]/g, '')
    }
  })

  return config
}

// 写入配置文件
function writeConfig(config) {
  const envPath = path.join(__dirname, '../.env.local')
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n')

  fs.writeFileSync(envPath, envContent + '\n')
  logSuccess('.env.local 文件已创建/更新')
}

// 主设置流程
async function setupEnvironment() {
  logHeader('🚀 Telos Google OAuth 开发环境设置')
  log('此脚本将帮助您设置本地开发环境的 Google OAuth 配置。\n')

  // 检查现有配置
  const hasExistingConfig = checkExistingConfig()
  let config = {}

  if (hasExistingConfig) {
    const overwrite = await question(
      '检测到现有的 .env.local 文件。是否要覆盖？(y/N): '
    )
    if (overwrite.toLowerCase() !== 'y') {
      config = readExistingConfig()
      logInfo('将更新现有配置...')
    }
  }

  // 设置基本配置
  logHeader('基本配置')

  // AUTH_SECRET
  if (
    !config.AUTH_SECRET ||
    config.AUTH_SECRET.includes('your-32-character-secret-key-here')
  ) {
    const useGenerated = await question(
      '是否自动生成安全的 AUTH_SECRET？(Y/n): '
    )
    if (useGenerated.toLowerCase() !== 'n') {
      config.AUTH_SECRET = generateSecretKey()
      logSuccess('已生成安全的 AUTH_SECRET')
    } else {
      config.AUTH_SECRET = await question('请输入 AUTH_SECRET (至少32字符): ')
    }
  } else {
    logInfo(`使用现有的 AUTH_SECRET: ${config.AUTH_SECRET.substring(0, 8)}...`)
  }

  // NEXTAUTH_URL
  if (!config.NEXTAUTH_URL) {
    const defaultUrl = 'http://localhost:8800'
    const url = await question(`NEXTAUTH_URL (${defaultUrl}): `)
    config.NEXTAUTH_URL = url || defaultUrl
  } else {
    logInfo(`使用现有的 NEXTAUTH_URL: ${config.NEXTAUTH_URL}`)
  }

  // Google OAuth 配置
  logHeader('Google OAuth 配置')
  logInfo('请先在 Google Cloud Console 中创建 OAuth 2.0 客户端 ID')
  logInfo(
    '重定向 URI 应设置为: ' + config.NEXTAUTH_URL + '/api/auth/callback/google'
  )

  // Google Client ID
  if (
    !config.GOOGLE_CLIENT_ID ||
    config.GOOGLE_CLIENT_ID.includes('your-google-client-id')
  ) {
    config.GOOGLE_CLIENT_ID = await question('请输入 Google Client ID: ')
  } else {
    const updateGoogle = await question(
      `使用现有的 Google Client ID (${config.GOOGLE_CLIENT_ID.substring(0, 20)}...)？(Y/n): `
    )
    if (updateGoogle.toLowerCase() === 'n') {
      config.GOOGLE_CLIENT_ID = await question('请输入新的 Google Client ID: ')
    }
  }

  // Google Client Secret
  if (
    !config.GOOGLE_CLIENT_SECRET ||
    config.GOOGLE_CLIENT_SECRET.includes('your-google-client-secret')
  ) {
    config.GOOGLE_CLIENT_SECRET = await question(
      '请输入 Google Client Secret: '
    )
  } else {
    const updateSecret = await question(
      '是否更新 Google Client Secret？(y/N): '
    )
    if (updateSecret.toLowerCase() === 'y') {
      config.GOOGLE_CLIENT_SECRET = await question(
        '请输入新的 Google Client Secret: '
      )
    }
  }

  // GitHub OAuth 配置 (可选)
  logHeader('GitHub OAuth 配置 (可选)')
  const setupGitHub = await question('是否配置 GitHub OAuth？(y/N): ')

  if (setupGitHub.toLowerCase() === 'y') {
    if (!config.GITHUB_CLIENT_ID) {
      config.GITHUB_CLIENT_ID = await question('请输入 GitHub Client ID: ')
    }
    if (!config.GITHUB_CLIENT_SECRET) {
      config.GITHUB_CLIENT_SECRET = await question(
        '请输入 GitHub Client Secret: '
      )
    }
  }

  // 其他配置
  config.NODE_ENV = 'development'

  // 写入配置文件
  writeConfig(config)

  // 安装依赖
  logHeader('安装依赖')
  const installDeps = await question('是否安装项目依赖？(Y/n): ')
  if (installDeps.toLowerCase() !== 'n') {
    try {
      logInfo('正在安装依赖...')
      execSync('pnpm install', {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
      })
      logSuccess('依赖安装完成')
    } catch (error) {
      logError('依赖安装失败: ' + error.message)
    }
  }

  // 运行配置验证
  logHeader('验证配置')
  const runValidation = await question('是否运行配置验证？(Y/n): ')
  if (runValidation.toLowerCase() !== 'n') {
    try {
      execSync('node scripts/test-dev-config.mjs', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      })
    } catch (error) {
      logWarning('配置验证发现一些问题，请检查上述输出')
    }
  }

  // 完成设置
  logHeader('设置完成')
  logSuccess('开发环境配置已完成！')
  logInfo('下一步：')
  logInfo('1. 启动开发服务器: pnpm web:dev')
  logInfo('2. 访问 http://localhost:8800/auth/signin')
  logInfo('3. 测试 Google OAuth 登录功能')
  logInfo('4. 查看开发文档: docs/development-testing-guide.md')

  rl.close()
}

// 错误处理
process.on('SIGINT', () => {
  log('\n\n设置已取消')
  rl.close()
  process.exit(0)
})

// 运行设置
setupEnvironment().catch(error => {
  logError('设置过程中出现错误: ' + error.message)
  rl.close()
  process.exit(1)
})
