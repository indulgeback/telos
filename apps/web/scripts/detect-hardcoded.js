import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 根目录是指向 apps/web 目录
const srcDir = path.resolve(__dirname, '../src')

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      // 排除语言文件夹
      if (file !== 'lang') {
        scanDirectory(filePath, fileList)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath)
    }
  })
  return fileList
}

const chineseRegex = /[\u4e00-\u9fa5]/

const files = scanDirectory(srcDir)
let totalCount = 0

console.log('=== 开始扫描硬编码中文 ===')

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // 排除注释、console 打印、导入、日志打印等非 UI 内容
    if (
      chineseRegex.test(trimmed) &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('import ') &&
      !trimmed.startsWith('console.') &&
      !trimmed.includes('tlog.')
    ) {
      // 转换为相对于项目根目录的相对路径
      const relativePath = path.relative(
        path.resolve(__dirname, '../../..'),
        filePath
      )
      console.log(`[硬编码] ${relativePath}:${index + 1}: ${trimmed}`)
      totalCount++
    }
  })
})

console.log(`\n扫描完成！共找到 ${totalCount} 处可能存在的硬编码中文。`)
