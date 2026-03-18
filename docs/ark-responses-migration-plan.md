# 火山方舟模型切换 Responses API 方案

## 背景

当前 `agent-service` 的模型调用链路统一走 OpenAI-compatible 的 `chat/completions` 风格。  
为了对齐更新接口能力，计划将 **火山方舟供应商（seed / glm / kimi）** 切换为 **Responses API**，DeepSeek 保持现状。

## 目标

- `provider=seed` 的模型走 `responses` 协议调用
- `provider=deepseek` 保持 `chat/completions`
- 前端保持现有交互不变（仍消费 AI SDK UIMessage 流）
- 工具调用链路与推理展示能力保持可用
- 支持不兼容字段自动降级

## 范围

- 后端：`services/agent-service`
- 前端：无需改协议，只做兼容验证
- 数据库：无需结构变更

## 设计方案

### 1. Provider 分流

- 在模型解析后增加调用分流：
  - `deepseek` -> 继续 `chat/completions`（现有实现）
  - `seed` -> 新增 `responses` 调用器

### 2. 请求映射

- 输入消息从当前 `messages` 结构映射为 `responses.input` 结构
- 图片保持多模态块传入
- 豆包思考强度映射：
  - `reasoningEffort` -> `reasoning_effort`（或 provider 对应字段）

### 3. 流式事件适配

- 新增 Responses 流事件转 UIMessage 事件层：
  - 文本 delta -> `text-start/text-delta/text-end`
  - 推理 delta -> `reasoning-start/reasoning-delta/reasoning-end`
  - 工具调用过程 -> `tool-input-* / tool-output-*`
- 保持现有前端渲染组件不改

### 4. 工具调用闭环

- Responses 返回工具调用意图时：
  1. 执行本地内置工具（时间/计算器）
  2. 将工具结果以 Responses 规范回填
  3. 继续下一轮生成直到拿到最终回答

### 5. 能力降级策略

- 模型不支持某字段时自动降级，不中断请求
- 降级优先级：
  1. 去掉可选推理字段
  2. 去掉可选多模态字段（保留文本）
  3. 回退到基础文本生成

## 实施步骤

1. 抽象统一模型调用接口（按 provider 分发）
2. 新增 `seed-responses` 调用模块（请求、流式解析、错误归一）
3. 适配工具调用事件到现有 UIMessage writer
4. 增加模型能力探测与字段降级
5. 完成回归测试（文本、推理、工具、图片）
6. 灰度开关：可通过配置快速回退到旧链路

## 回归用例（最小集）

- Seed 文本对话（流式）
- Seed 图片理解（单图/多图）
- Seed 推理开关（minimal/low/medium/high）
- Seed 工具调用（时间/计算器）+ 最终续写
- DeepSeek 文本与推理（确保不受影响）

## 风险与应对

- 风险：不同模型对 Responses 字段支持不一致  
  - 应对：模型级 capability + 自动降级
- 风险：流事件格式变化导致前端显示异常  
  - 应对：统一事件适配层 + 回归快照
- 风险：工具调用中断导致一直 loading  
  - 应对：每一步兜底 `finish-step` 与超时保护

## 预计工作量

- 后端改造：1~2 天
- 联调与回归：0.5~1 天
- 总计：约 2~3 天

## 回退策略

- 保留旧 `chat/completions` 实现
- 通过配置开关切换 seed 使用旧/新链路
- 出现故障可快速回退，不影响 DeepSeek
