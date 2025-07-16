const { translate } = require('bing-translate-api')
const { executeIncrementalTranslation } = require('./utils')

/**
 * 使用 Bing 机器翻译进行翻译
 * @param {string} text - 要翻译的文本
 * @param {string} source - 源语言
 * @param {string} target - 目标语言
 * @returns {Promise<string>} 翻译结果
 */
async function translateText(text, _source, target) {
  const res = await translate(text, null, target)
  return res.translation
}

// 执行翻译
executeIncrementalTranslation(translateText, 'Bing 机器翻译', 0)
