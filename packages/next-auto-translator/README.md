# next-auto-translator

A utility for batch multi-language translation with lock file and error logging. Supports custom language directory, error tracking, and incremental translation for Next.js and other Node.js projects.

## Features

- Incremental translation (only new/changed/missing keys)
- Batch multi-language translation
- Lock file for base language
- Error logging to error.json
- Custom language directory (langDir)
- Class-based API, easy to use

## Usage

```js
const AutoTranslator = require("next-auto-translator")
const { translate } = require("bing-translate-api")

async function translateText(text, _source, target) {
  const res = await translate(text, null, target)
  return res.translation
}

const utils = new AutoTranslator({
  translateFunction: translateText,
  translatorName: "Bing",
  baseLang: "en",
  targetLangs: ["zh", "ja", "fr"],
  delay: 0,
  langMap: { zh: "zh-Hans" },
  langDir: "src/lang",
  incremental: true, // 是否只翻译新增/变更的 key，默认 true
  strictKeySync: true, // 是否保证 key 与 lock.json 一致，去除多余 key，默认 true
})

utils.batchTranslateMultiLang()
```

## Options

| 参数              | 类型     | 默认值     | 说明                                          |
| ----------------- | -------- | ---------- | --------------------------------------------- |
| translateFunction | function | 必填       | 翻译函数，接收 (text, sourceLang, targetLang) |
| translatorName    | string   | 必填       | 翻译器名称（用于日志输出）                    |
| baseLang          | string   | 必填       | 基础语言（如 'en'）                           |
| targetLangs       | string[] | 必填       | 目标语言数组（如 ['zh', 'ja']）               |
| delay             | number   | 0          | 每次翻译后的延迟（毫秒）                      |
| langMap           | object   | undefined  | 语言映射表（如 { zh: 'zh-CN' }），可选        |
| langDir           | string   | 'src/lang' | 语言文件目录                                  |
| incremental       | boolean  | true       | 是否只翻译新增/变更的 key                     |
| strictKeySync     | boolean  | true       | 是否保证 key 与 lock.json 一致，去除多余 key  |

## License

MIT
