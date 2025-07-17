const { translate } = require('bing-translate-api')
const TranslatorUtils = require('./utils')

async function translateText(text, _source, target) {
  const res = await translate(text, null, target)
  return res.translation
}

// ====== 配置区 ======
const baseLang = 'en' // 基准语言
const targetLangs = ['zh', 'ja', 'fr'] // 目标语言包文件名
const langMap = {
  'zh': 'zh-Hans',
}
// ====================

const utils = new TranslatorUtils({
  translateFunction: translateText,
  translatorName: 'Bing 机器翻译',
  baseLang,
  targetLangs,
  delay: 0,
  langMap
})

utils.batchTranslateMultiLang()
