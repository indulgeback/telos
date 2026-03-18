# 百炼模型对接方案（准备稿）

## 目标

- 在 `agent-service` 新增阿里百炼（DashScope / Model Studio）模型供应商支持。
- 与现有 `deepseek`、`seed` 保持同一接口：`POST /api/agent`、`GET /api/agent/models`。
- 先落地 **OpenAI Chat Completions 兼容模式**，后续可选支持 Responses API（应用/工具场景）。

## 官方接口与 URL

### 1) OpenAI 兼容 Chat Completions（推荐先接）

- 中国内地（北京）`base_url`：
  - `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 新加坡（国际）`base_url`：
  - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- 弗吉尼亚（全球/美国）`base_url`：
  - `https://dashscope-us.aliyuncs.com/compatible-mode/v1`

对应 HTTP endpoint 为：
- `POST {base_url}/chat/completions`

### 2) OpenAI 兼容 Responses（可选二期）

百炼 Responses 文档目前主要分两类路径：

- 应用调用（Agent/Workflow，需 APP_ID）：
  - `https://dashscope.aliyuncs.com/api/v2/apps/agent/{APP_ID}/compatible-mode/v1/responses`
- 应用协议（部分工具能力）：
  - `https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1`（SDK `responses.create`）

> 结论：我们当前“模型直连聊天”优先走 Chat Completions 更稳，Responses 放二期。

## 参数支持策略（与现有代码对齐）

### 通用参数

- `model`: 百炼模型名（如 `qwen-plus`、`qwen3-vl-plus`）
- `messages`: OpenAI 兼容格式（已存在）
- `stream`: true（保持当前流式架构）

### 思考参数（百炼）

- 百炼文档建议在 OpenAI 兼容下通过 `extra_body` 传：
  - `enable_thinking: boolean`
  - `thinking_budget: number`（限制思考 token）

落地映射建议：
- 复用前端现有 `reasoningEffort`，后端映射为：
  - `minimal` -> `enable_thinking=false`
  - `low` -> `enable_thinking=true, thinking_budget=256`
  - `medium` -> `enable_thinking=true, thinking_budget=1024`
  - `high` -> `enable_thinking=true, thinking_budget=4096`

### 推理内容提取

- 百炼思考流在兼容模式下可从 `reasoning_content` 字段读取（与我们现有解析逻辑一致，可直接复用并增强）。

### 图片识别

- 继续使用当前多模态消息结构：
  - `content: [{type:'text', text:'...'}, {type:'image_url', image_url:{url:'...'}}]`
- 百炼视觉模型（如 `qwen3-vl-plus`）兼容该格式。

## 项目改造清单

### 后端 `services/agent-service`

1. 配置新增（`src/config/index.ts`）
- `BAILIAN_API_KEY`
- `BAILIAN_BASE_URL`（默认北京）

2. DB 枚举扩展（`prisma/schema.prisma`）
- `enum ChatModelProvider` 增加 `bailian`

3. 模型初始化（`src/services/chat.ts`）
- 默认模型池追加百炼模型（建议先 2~4 个）：
  - `qwen-plus`
  - `qwen-max`
  - `qwen3-vl-plus`
  - `qwen3-vl-flash`
- `toChatModelOption` / 类型扩展支持 `bailian`

4. 运行时分流（`src/services/chat.ts`）
- `resolveModelConfig` 根据 `provider` 注入对应 key/baseURL
- `createModel` 为 `bailian` 注入 `modelKwargs`：
  - `enable_thinking`
  - `thinking_budget`

5. 兼容与兜底
- 未配置 `BAILIAN_API_KEY` 时抛明确错误
- 非思考模型自动忽略 thinking 参数（不报错）

### 前端 `apps/web`

1. 模型下拉无需大改（来自 `/api/agent/models`）
2. 思考深度控件展示条件从“仅 seed”升级为“支持 reasoning 的 provider 列表”：
- `seed`、`bailian`（按模型能力标记 `isReasoning`）
3. `zh.json` 保持现有 key，不新增文案。

## 测试清单

1. 文本流式：`qwen-plus`
2. 推理流式：`qwen-plus` + `enable_thinking=true`
3. 思考关闭：`minimal` 映射后无 `reasoning_content`
4. 图片理解：`qwen3-vl-plus` + image_url（URL 与 base64）
5. 工具调用后续写：时间/计算器链路不回退

## 风险与注意事项

- 百炼不同模型对 thinking 参数支持有差异，需按模型能力降级。
- 地域与 API Key 强绑定，跨地域调用会失败（需按部署模式配置）。
- Responses API 在百炼侧分“模型直连/应用调用”两套路径，若走 Responses 要明确是应用还是模型直连场景。
