import AutoTranslator from 'next-auto-translator'
import { translate } from 'bing-translate-api'

async function translateText(text, _source, target) {
  try {
    const res = await translate(text, null, target)
    return res.translation
  } catch (error) {
    console.error(`翻译失败: "${text}" -> ${target}`, error.message)
    throw error
  }
}

// ====== 配置区 ======
const baseLang = 'zh' // 基准语言
const targetLangs = ['en', 'tw', 'ko', 'ja', 'de', 'ru'] // 目标语言包文件名
const langMap = {
  zh: 'zh-Hans',
  tw: 'zh-Hant',
}
const langDir = 'src/lang' // 语言包文件夹路径
// ====================

const translator = new AutoTranslator({
  translateFunction: translateText,
  translatorName: 'Bing 机器翻译',
  baseLang,
  targetLangs,
  delay: 0,
  langMap,
  langDir,
  incremental: true,
  strictKeySync: true,
})

async function runTranslations() {
  try {
    await translator.batchTranslateMultiLang()
    console.log('✓ 翻译完成')
  } catch (error) {
    console.error('✗ 翻译失败:', error.message)
    process.exit(1)
  }
}

runTranslations()
