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
})

utils.batchTranslateMultiLang()
```

## License

MIT
