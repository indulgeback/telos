#!/usr/bin/env node

/**
 * 开发环境配置验证脚本
 * 验证 Google OAuth 开发环境配置是否正确
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
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

// 检查环境变量文件
function checkEnvFile() {
  logHeader('检查环境变量配置')

  const envPath = path.join(__dirname, '../.env.local')

  if (!fs.existsSync(envPath)) {
    logError('.env.local 文件不存在')
    logInfo('请创建 .env.local 文件并配置必要的环境变量')
    logInfo('可以运行 pnpm setup:dev 进行自动设置')
    return false
  }

  logSuccess('.env.local 文件存在')

  // 读取环境变量
  const envContent = fs.readFileSync(envPath, 'utf8')
  const envVars = {}

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/['"]/g, '')
    }
  })

  // 检查必需的环境变量
  const requiredVars = [
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]

  let allVarsPresent = true

  requiredVars.forEach(varName => {
    if (envVars[varName]) {
      logSuccess(`${varName} 已配置`)

      // 特定变量的验证
      if (varName === 'AUTH_SECRET') {
        if (envVars[varName].length < 32) {
          logWarning(`${varName} 长度应至少为 32 个字符`)
        }
        if (envVars[varName].includes('your-32-character-secret-key-here')) {
          logWarning(`${varName} 使用的是示例值，请生成一个安全的密钥`)
        }
      }

      if (varName === 'NEXTAUTH_URL') {
        if (!envVars[varName].startsWith('http://localhost:')) {
          logWarning(`${varName} 应该是本地开发 URL (http://localhost:端口)`)
        }
      }

      if (varName === 'GOOGLE_CLIENT_ID') {
        if (!envVars[varName].endsWith('.apps.googleusercontent.com')) {
          logWarning(
            `${varName} 格式可能不正确，应该以 .apps.googleusercontent.com 结尾`
          )
        }
        if (envVars[varName].includes('your-google-client-id')) {
          logError(`${varName} 使用的是示例值，请配置真实的 Google 客户端 ID`)
          allVarsPresent = false
        }
      }

      if (varName === 'GOOGLE_CLIENT_SECRET') {
        if (envVars[varName].includes('your-google-client-secret')) {
          logError(`${varName} 使用的是示例值，请配置真实的 Google 客户端密钥`)
          allVarsPresent = false
        }
      }
    } else {
      logError(`${varName} 未配置`)
      allVarsPresent = false
    }
  })

  // 检查可选变量
  const optionalVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
  optionalVars.forEach(varName => {
    if (envVars[varName]) {
      logSuccess(`${varName} 已配置 (可选)`)
    } else {
      logInfo(`${varName} 未配置 (可选，用于 GitHub 登录)`)
    }
  })

  return allVarsPresent
}

// 检查依赖包
function checkDependencies() {
  logHeader('检查项目依赖')

  const packageJsonPath = path.join(__dirname, '../package.json')

  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json 文件不存在')
    return false
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  // 检查关键依赖
  const requiredDeps = ['next-auth', 'next', 'react', 'react-dom']

  let allDepsPresent = true

  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      logSuccess(`${dep} 已安装 (${packageJson.dependencies[dep]})`)
    } else {
      logError(`${dep} 未安装`)
      allDepsPresent = false
    }
  })

  // 检查 node_modules
  const nodeModulesPath = path.join(__dirname, '../node_modules')
  if (fs.existsSync(nodeModulesPath)) {
    logSuccess('node_modules 目录存在')
  } else {
    logError('node_modules 目录不存在，请运行 pnpm install')
    allDepsPresent = false
  }

  return allDepsPresent
}

// 检查关键文件
function checkFiles() {
  logHeader('检查关键文件')

  const requiredFiles = [
    '../src/auth.ts',
    '../src/app/[locale]/(default-layout)/auth/signin/page.tsx',
    '../src/app/[locale]/(default-layout)/auth/error/page.tsx',
    '../src/components/atoms/icons/GoogleIcon.tsx',
    '../src/lib/api-client.ts',
    '../src/lib/security.ts',
  ]

  let allFilesPresent = true

  requiredFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath)
    if (fs.existsSync(fullPath)) {
      logSuccess(`${path.basename(filePath)} 存在`)
    } else {
      logError(`${filePath} 不存在`)
      allFilesPresent = false
    }
  })

  return allFilesPresent
}

// 检查端口可用性
function checkPort() {
  logHeader('检查端口可用性')

  try {
    // 检查端口 8800 是否被占用
    execSync('lsof -ti:8800', { stdio: 'ignore' })
    logWarning('端口 8800 已被占用，请确保没有其他服务在使用此端口')
    return false
  } catch (error) {
    logSuccess('端口 8800 可用')
    return true
  }
}

// 检查测试配置
function checkTestConfig() {
  logHeader('检查测试配置')

  const testFiles = [
    '../jest.config.mjs',
    '../jest.setup.js',
    '../jest.integration.config.mjs',
    '../jest.integration.setup.js',
  ]

  let allTestFilesPresent = true

  testFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath)
    if (fs.existsSync(fullPath)) {
      logSuccess(`${path.basename(filePath)} 存在`)
    } else {
      logWarning(`${filePath} 不存在 (测试配置文件)`)
      allTestFilesPresent = false
    }
  })

  return allTestFilesPresent
}

// 生成配置建议
function generateConfigSuggestions() {
  logHeader('配置建议')

  logInfo('1. 确保已在 Google Cloud Console 中创建 OAuth 2.0 客户端')
  logInfo(
    '2. 重定向 URI 应设置为: http://localhost:8800/api/auth/callback/google'
  )
  logInfo('3. 使用以下命令生成安全的 AUTH_SECRET:')
  logInfo('   openssl rand -base64 32')
  logInfo('4. 启动开发服务器: pnpm web:dev')
  logInfo('5. 访问 http://localhost:8800/auth/signin 测试登录功能')
  logInfo('6. 运行自动设置: pnpm setup:dev')
}

// 主函数
function main() {
  log(`${colors.bold}🔍 Telos Google OAuth 开发环境配置检查${colors.reset}`)
  log('='.repeat(50))

  const checks = [
    checkEnvFile,
    checkDependencies,
    checkFiles,
    checkPort,
    checkTestConfig,
  ]

  let allChecksPassed = true

  checks.forEach(check => {
    try {
      const result = check()
      if (!result) {
        allChecksPassed = false
      }
    } catch (error) {
      logError(`检查过程中出现错误: ${error.message}`)
      allChecksPassed = false
    }
  })

  logHeader('检查结果')

  if (allChecksPassed) {
    logSuccess('所有检查都通过！开发环境配置正确。')
    logInfo('您现在可以启动开发服务器并测试 Google OAuth 功能。')
  } else {
    logError('部分检查未通过，请根据上述提示修复问题。')
  }

  generateConfigSuggestions()

  log('\n' + '='.repeat(50))
  log(`${colors.bold}检查完成${colors.reset}`)

  process.exit(allChecksPassed ? 0 : 1)
}

// 运行脚本
main()
