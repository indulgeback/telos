# 翻译器脚本使用说明

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
