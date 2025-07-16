const TmtClient = require('tencentcloud-sdk-nodejs').tmt.v20180321.Client
const { executeIncrementalTranslation } = require('./utils')
require('dotenv').config()

const secretId = process.env.TENCENT_SECRET_ID
const secretKey = process.env.TENCENT_SECRET_KEY

const clientConfig = {
  credential: {
    secretId,
    secretKey,
  },
  region: 'ap-beijing',
  profile: {
    httpProfile: {
      endpoint: 'tmt.tencentcloudapi.com',
    },
  },
}

const client = new TmtClient(clientConfig)

/**
 * 使用腾讯云机器翻译进行翻译
 * @param {string} text - 要翻译的文本
 * @param {string} source - 源语言
 * @param {string} target - 目标语言
 * @returns {Promise<string>} 翻译结果
 */
async function translateText(text, source, target) {
  const params = {
    SourceText: text,
    Source: source,
    Target: target,
    ProjectId: 0,
  }
  const res = await client.TextTranslate(params)
  return res.TargetText
}

// 执行翻译
executeIncrementalTranslation(translateText, '腾讯云机器翻译', 0)
