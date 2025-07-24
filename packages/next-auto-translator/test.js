const fs = require('fs')
const path = require('path')
const AutoTranslator = require('./src/index')
const colors = require('colors')

// mock 翻译函数，直接返回 `${text}-${target}`
async function mockTranslate(text, _source, target) {
  return `${text}-${target}`
}

const langDir = path.join(__dirname, 'test-lang')

function cleanLangDir() {
  if (fs.existsSync(langDir)) {
    for (const f of fs.readdirSync(langDir)) {
      fs.unlinkSync(path.join(langDir, f))
    }
  } else {
    fs.mkdirSync(langDir)
  }
}

function writeBaseEn(data) {
  fs.writeFileSync(path.join(langDir, 'en.json'), JSON.stringify(data, null, 2))
}

async function testFullTranslate() {
  console.log(colors.yellow('\n开始测试全量翻译...\n'))

  cleanLangDir()
  const baseData = {
    hello: 'Hello',
    world: 'World',
    nested: { foo: 'Bar' }
  }
  writeBaseEn(baseData)
  const t = new AutoTranslator({
    translateFunction: mockTranslate,
    translatorName: 'mock',
    baseLang: 'en',
    targetLangs: ['zh', 'ja'],
    langDir,
    incremental: false,
    strictKeySync: true
  })
  await t.batchTranslateMultiLang() // 生成 lock 文件
  await t.batchTranslateMultiLang() // 生成目标语言文件
  const zh = JSON.parse(fs.readFileSync(path.join(langDir, 'zh.json')))
  if (zh.hello !== 'Hello-zh' || zh.nested.foo !== 'Bar-zh') throw new Error('全量翻译失败')
}

async function testIncrementalTranslate() {
  console.log(colors.yellow('\n开始测试增量翻译...\n'))

  cleanLangDir()
  // 先生成初始 lock 和 zh.json
  const baseData = {
    hello: 'Hello',
    world: 'World',
    nested: { foo: 'Bar' }
  }
  writeBaseEn(baseData)
  const t1 = new AutoTranslator({
    translateFunction: mockTranslate,
    translatorName: 'mock',
    baseLang: 'en',
    targetLangs: ['zh'],
    langDir,
    incremental: false,
    strictKeySync: true
  })
  await t1.batchTranslateMultiLang()
  await t1.batchTranslateMultiLang()
  // 新增 key，模拟增量
  baseData.added = 'New'
  writeBaseEn(baseData)
  const t2 = new AutoTranslator({
    translateFunction: mockTranslate,
    translatorName: 'mock',
    baseLang: 'en',
    targetLangs: ['zh'],
    langDir,
    incremental: true,
    strictKeySync: true
  })
  await t2.batchTranslateMultiLang() // 只执行一次，lock 旧，en.json 新
  const zh = JSON.parse(fs.readFileSync(path.join(langDir, 'zh.json')))
  if (zh.added !== 'New-zh') throw new Error('增量翻译失败')
}

async function testStrictKeySyncOff() {
  console.log(colors.yellow('\n开始测试 strictKeySync 关闭...\n'))

  cleanLangDir()
  const baseData = {
    hello: 'Hello',
    world: 'World',
    nested: { foo: 'Bar' }
  }
  writeBaseEn(baseData)
  const t1 = new AutoTranslator({
    translateFunction: mockTranslate,
    translatorName: 'mock',
    baseLang: 'en',
    targetLangs: ['zh'],
    langDir,
    incremental: false,
    strictKeySync: false
  })
  await t1.batchTranslateMultiLang()
  await t1.batchTranslateMultiLang()
  // 手动加多余 key
  const zhPath = path.join(langDir, 'zh.json')
  const zhObj = JSON.parse(fs.readFileSync(zhPath))
  zhObj.extra = 'should be kept'
  fs.writeFileSync(zhPath, JSON.stringify(zhObj, null, 2))
  // 再跑一次，strictKeySync 关闭应保留多余 key
  const t2 = new AutoTranslator({
    translateFunction: mockTranslate,
    translatorName: 'mock',
    baseLang: 'en',
    targetLangs: ['zh'],
    langDir,
    incremental: true,
    strictKeySync: false
  })
  await t2.batchTranslateMultiLang()
  const zh2 = JSON.parse(fs.readFileSync(zhPath))
  if (!zh2.extra) throw new Error('strictKeySync 关闭时多余 key 应保留')
}

async function runTest() {
  await testFullTranslate()
  await testIncrementalTranslate()
  await testStrictKeySyncOff()
  console.log('所有测试通过！')
}

runTest().catch(e => {
  console.error('测试失败:', e)
  process.exit(1)
}) 