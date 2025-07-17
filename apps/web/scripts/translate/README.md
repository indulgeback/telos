# 翻译器脚本使用说明

## 新特性

- 支持**增量翻译**，只翻译新增/变更/缺失字段，极大提升效率
- 支持**基准语言+多目标语言批量翻译**，一次生成多个语言包
- 只有基准语言有锁文件，目标语言包由脚本自动维护
- 只允许人工修改基准语言包，其他语言包全部自动生成
- 自动生成并维护**锁文件**，精准追踪翻译进度
- 支持**腾讯云**与**Bing**两种翻译源
- 保持 JSON 嵌套结构，翻译失败自动保留原文
- 目标文件不存在时自动创建，免去手动操作
- **采用类封装，配置更灵活，调用更简洁**
- **首次运行时自动创建锁文件，不会直接翻译目标语言包**
- **所有翻译失败的key会被记录到 src/lang/error.json，便于后续修复**
- **支持自定义语言包文件夹路径（langDir）**

这个目录包含了用于将英文语言文件翻译成中文的脚本。

## 文件结构

- `utils.js` - 公共工具函数，包含文件处理、JSON 扁平化等通用功能
- `tencent_translator.js` - 腾讯云机器翻译器
- `README.md` - 使用说明文档

## 可用的翻译器

### 1. 腾讯云翻译器 (tencent_translator.js)

使用腾讯云机器翻译服务进行翻译。

**配置要求：**

- 腾讯云账号和 API 密钥
- 已安装 `tencentcloud-sdk-nodejs` 依赖

**使用方法：**

```bash
cd apps/web
node scripts/translate/tencent_translator.js
```

### 2. Bing翻译器 (bing_translator.js)

使用Bing翻译服务进行翻译。

**配置要求：**

- 已安装 `bing-translator` 依赖

**使用方法：**

```bash
cd apps/web
node scripts/translate/bing_translator.js
```

## 环境变量配置

### 腾讯云翻译

```bash
export TENCENT_SECRET_ID="your-secret-id"
export TENCENT_SECRET_KEY="your-secret-key"
```

## 输入和输出文件

- **源文件：** `src/lang/en.json` (英文语言文件)
- **目标文件：** `src/lang/zh.json` (中文语言文件)

## 注意事项

1. 翻译器会保持 JSON 文件的嵌套结构
2. 如果翻译失败，会保留原文
3. 确保有足够的 API 配额和权限

## 安装依赖

```bash
cd apps/web
pnpm install
```

## 故障排除

### 腾讯云翻译常见问题

- **密钥错误：** 验证 SecretId 和 SecretKey 是否正确
- **地域问题：** 确保使用正确的服务地域
- **网络问题：** 检查网络连接和防火墙设置

## 配置多语言翻译

在 `tencent_translator.js` 或 `bing_translator.js` 顶部配置：

```js
const baseLang = 'en' // 基准语言
const targetLangs = ['zh', 'ja', 'fr'] // 目标语言数组
```

## 配置与用法

以 Bing 翻译为例：

```js
const { translate } = require('bing-translate-api')
const TranslatorUtils = require('./utils')

async function translateText(text, _source, target) {
  const res = await translate(text, null, target)
  return res.translation
}

const baseLang = 'en'
const targetLangs = ['zh', 'ja', 'fr']
const langMap = {
  zh: 'zh-Hans',
}
const langDir = 'src/lang' // 语言包文件夹路径

const utils = new TranslatorUtils({
  translateFunction: translateText,
  translatorName: 'Bing 机器翻译',
  baseLang,
  targetLangs,
  delay: 0,
  langMap,
  langDir,
})

utils.batchTranslateMultiLang()
```

- 只需维护 `src/lang/en.json`（基准语言包），其他语言包（如 zh.json、ja.json、fr.json）由脚本自动生成。
- 锁文件（如 en.lock.json）只针对基准语言。
- 每次运行脚本会自动对比基准语言和锁文件，找出需要翻译的字段，并同步到所有目标语言包。
- **首次运行时不会翻译目标语言包，只会生成锁文件。**
- **所有翻译失败的内容会被记录到 `src/lang/error.json`，便于后续人工处理。**
- **可通过 langDir 配置语言包文件夹路径，适配不同项目结构。**
