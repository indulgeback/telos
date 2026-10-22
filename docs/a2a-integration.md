# A2A 接入指南

Telos agent-service 通过 A2A 协议（JSON-RPC 2.0，protocolVersion 0.3.0）对外暴露默认 Agent。

## 前置条件

- 服务器 `.env` 配置 `A2A_API_KEY`（随机密钥，留空则端点整体禁用）
- 可选 `A2A_PUBLIC_BASE_URL`（外部可达的 base URL，如 `https://api.example.com/api/a2a`；缺省按请求 origin 推导）

## 接口

- Agent Card: `GET {base}/.well-known/agent-card.json`
- JSON-RPC: `POST {base}/`，支持 `message/send`（阻塞至多 120s）与 `tasks/get`
- 鉴权：`Authorization: Bearer <A2A_API_KEY>`

## 示例

```bash
# 1. 发现
curl https://api.example.com/api/a2a/.well-known/agent-card.json

# 2. 发送消息（阻塞等待完成）
curl -X POST https://api.example.com/api/a2a/ \
  -H "Authorization: Bearer $A2A_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1, "method": "message/send",
    "params": {"message": {"role": "user", "parts": [{"kind": "text", "text": "你好，介绍一下你自己"}]}}
  }'

# 3. 超时返回 state=working 时，用返回的 task id 轮询
curl -X POST https://api.example.com/api/a2a/ \
  -H "Authorization: Bearer $A2A_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tasks/get", "params": {"id": "<taskId>"}}'
```

## 状态映射

| 内部 run 状态 | A2A task state |
|---|---|
| queued | submitted |
| running | working |
| awaiting_approval | input-required |
| completed | completed（finalOutput 作为 artifact） |
| failed | failed |
| cancelled | canceled |

A2A 线程归属于内部伪用户 `a2a-external`，与普通用户会话隔离。
