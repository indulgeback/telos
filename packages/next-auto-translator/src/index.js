const fs = require('fs')
const colors = require('colors')

class AutoTranslator {
  #translateFunction
  #translatorName
  #baseLang
  #targetLangs
  #delay
  #langMap
  #langDir
  #incremental
  #strictKeySync

  /**
   * @param {Object} options 配置项
   * @param {function(string, string, string): Promise<string>} options.translateFunction 翻译函数，接收 (text, sourceLang, targetLang)
   * @param {string} options.translatorName 翻译器名称（用于日志输出）
   * @param {string} options.baseLang 基础语言（如 'en'）
   * @param {string[]} options.targetLangs 目标语言数组（如 ['zh', 'ja']）
   * @param {number} [options.delay=0] 每次翻译后的延迟（毫秒）
   * @param {Object} [options.langMap] 语言映射表（如 { zh: 'zh-CN' }），可选
   * @param {string} [options.langDir='src/lang'] 语言文件目录，默认 'src/lang'
   * @param {boolean} [options.incremental=true] 是否只翻译新增/变更的 key，默认 true
   * @param {boolean} [options.strictKeySync=true] 是否保证 key 与 lock.json 一致，去除多余 key，默认 true
   */
  constructor({ translateFunction, translatorName, baseLang, targetLangs, delay = 0, langMap = undefined, langDir = 'src/lang', incremental = true, strictKeySync = true }) {
    this.#translateFunction = translateFunction
    this.#translatorName = translatorName
    this.#baseLang = baseLang
    this.#targetLangs = targetLangs
    this.#delay = delay
    this.#langMap = langMap
    this.#langDir = langDir.replace(/\/$/, '') // 去除末尾/
    this.#incremental = incremental
    this.#strictKeySync = strictKeySync
  }

  // 私有方法
  #flatten(obj, prefix = '', res = {}) {
    for (const key in obj) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        this.#flatten(value, newKey, res)
      } else {
        res[newKey] = value
      }
    }
    return res
  }

  #unflatten(data) {
    const result = {}
    for (const flatKey in data) {
      const keys = flatKey.split('.')
      keys.reduce((acc, key, i) => {
        if (i === keys.length - 1) {
          acc[key] = data[flatKey]
        } else {
          acc[key] = acc[key] || {}
        }
        return acc[key]
      }, result)
    }
    return result
  }

  #findMissingKeys(sourceFlat, targetFlat) {
    const missing = {}
    for (const key in sourceFlat) {
      if (!(key in targetFlat)) {
        missing[key] = sourceFlat[key]
      }
    }
    return missing
  }

  #findChangedOrNewKeys(sourceFlat, lockFlat) {
    if (!lockFlat) return { ...sourceFlat }
    const changed = {}
    for (const key in sourceFlat) {
      if (!(key in lockFlat) || sourceFlat[key] !== lockFlat[key]) {
        changed[key] = sourceFlat[key]
      }
    }
    return changed
  }

  #filterKeysByLock(sourceFlat, lockFlat) {
    const filtered = {}
    for (const key in lockFlat) {
      if (key in sourceFlat) {
        filtered[key] = sourceFlat[key]
      }
    }
    return filtered
  }

  #readLockFile(lockFile) {
    if (!fs.existsSync(lockFile)) return null
    try {
      return JSON.parse(fs.readFileSync(lockFile, 'utf-8'))
    } catch (error) {
      console.error(colors.red('错误: 无法读取锁文件'), lockFile)
      console.error('错误详情:', error.message)
      return null
    }
  }

  #writeLockFile(lockFile, flatSource) {
    try {
      fs.writeFileSync(lockFile, JSON.stringify(flatSource, null, 2), 'utf-8')
      console.log(`${colors.green('✓')} 已写入锁文件 ${lockFile}`)
    } catch (error) {
      console.error(colors.red('错误: 无法写入锁文件'), lockFile)
      console.error('错误详情:', error.message)
    }
  }

  async #translateText(text, source, target) {
    try {
      return await this.#translateFunction(text, source, target)
    } catch (error) {
      console.error('翻译 API 错误:', error.message)
      throw error
    }
  }

  // 公开方法
  /**
   * 多语言批量翻译
   */
  async batchTranslateMultiLang() {
    const incremental = this.#incremental
    const strictKeySync = this.#strictKeySync
    console.log(colors.cyan(`开始使用${this.#translatorName}进行多语言批量翻译...`))
    const baseFile = `${this.#langDir}/${this.#baseLang}.json`
    const lockFile = `${this.#langDir}/${this.#baseLang}.lock.json`
    const errorLog = []
    const baseData = JSON.parse(fs.readFileSync(baseFile, 'utf-8'))
    const baseFlat = this.#flatten(baseData)
    let lockFlat = this.#readLockFile(lockFile)
    // 如果没有锁文件，直接创建锁文件并退出
    if (!lockFlat) {
      this.#writeLockFile(lockFile, baseFlat)
      console.log(colors.green(`首次运行，已创建锁文件 ${lockFile}，未进行增量翻译。`))
      return
    }
    // diffKeys 只在 incremental=true 时生效，否则为空对象
    const diffKeys = incremental ? this.#findChangedOrNewKeys(baseFlat, lockFlat) : {}
    for (const lang of this.#targetLangs) {
      if (lang === this.#baseLang) continue
      const apiLang = this.#langMap ? (this.#langMap[lang] || lang) : lang
      const targetFile = `${this.#langDir}/${lang}.json`
      let targetData = {}
      if (fs.existsSync(targetFile)) {
        targetData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'))
      }
      const targetFlat = this.#flatten(targetData)
      const missingFlat = this.#findMissingKeys(baseFlat, targetFlat)
      // 需要翻译的 key，增量模式下包含 diffKeys，否则全量翻译
      const needTranslateFlat = incremental ? { ...diffKeys, ...missingFlat } : baseFlat
      if (Object.keys(needTranslateFlat).length === 0) {
        // 只做 key 对齐
        let filteredFlat
        if (strictKeySync) {
          filteredFlat = this.#filterKeysByLock(targetFlat, lockFlat)
        } else {
          filteredFlat = { ...targetFlat }
        }
        const result = this.#unflatten(filteredFlat)
        fs.writeFileSync(targetFile, JSON.stringify(result, null, 2), 'utf-8')
        console.log(colors.green(`[${lang}] 没有需要翻译/补齐的字段，但已同步 key 至 lock.json`))
        continue
      }
      const translated = {}
      for (const key of Object.keys(needTranslateFlat)) {
        try {
          const res = await this.#translateText(needTranslateFlat[key], this.#baseLang, apiLang)
          translated[key] = res
          console.log(colors.green(`[${lang}] ✓ ${needTranslateFlat[key]} → ${res}`))
          if (this.#delay > 0) await new Promise(resolve => setTimeout(resolve, this.#delay))
        } catch (e) {
          console.error(colors.red(`[${lang}] ✗ 翻译失败: ${key}: ${needTranslateFlat[key]}`))
          translated[key] = needTranslateFlat[key]
          errorLog.push({ lang, key, value: needTranslateFlat[key], error: e.message })
        }
      }
      const mergedFlat = { ...targetFlat, ...translated }
      // 保证 key 与 lock.json 一致，去除多余 key
      let filteredFlat
      if (strictKeySync) {
        if (incremental) {
          // 增量翻译时，允许 lockFlat 和 diffKeys 里的 key 都被写入
          const allowedKeys = { ...lockFlat, ...diffKeys }
          filteredFlat = {}
          for (const key in allowedKeys) {
            if (key in mergedFlat) filteredFlat[key] = mergedFlat[key]
          }
        } else {
          filteredFlat = this.#filterKeysByLock(mergedFlat, lockFlat)
        }
      } else {
        filteredFlat = { ...mergedFlat }
      }
      const result = this.#unflatten(filteredFlat)
      fs.writeFileSync(targetFile, JSON.stringify(result, null, 2), 'utf-8')
      console.log(colors.green(`[${lang}] 已写入 ${targetFile}`))
    }
    this.#writeLockFile(lockFile, baseFlat)
    console.log(colors.green(`已更新锁文件 ${lockFile}`))
    // 写入错误日志
    if (errorLog.length > 0) {
      const errorPath = `${this.#langDir}/error.json`
      fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2), 'utf-8')
      console.log(colors.red(`部分翻译失败，详情见 ${errorPath}`))
    }
  }
}

module.exports = AutoTranslator
