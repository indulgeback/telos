const { translate } = require('bing-translate-api')
const AutoTranslator = require('next-auto-translator')

async function translateText(text, _source, target) {
  const res = await translate(text, null, target)
  return res.translation
}

// ====== 配置区 ======
const baseLang = 'zh' // 基准语言
const targetLangs = [
  'es',
  'en',
  'de',
  'fr',
  'pt',
  'it',
  'ja',
  'th',
  'pl',
  'ko',
  'ru',
  'da',
  'nb',
  'nl',
  'id',
  'tw',
  'tr',
] // 目标语言包文件名
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
  langDir
})

translator.batchTranslateMultiLang()
