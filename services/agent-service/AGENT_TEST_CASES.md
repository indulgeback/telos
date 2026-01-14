# Agent 管理功能测试用例文档

## 测试环境准备

### 前置条件
- PostgreSQL 数据库已启动
- agent-service 已启动
- api-gateway 已启动
- 前端应用已启动

### 数据库初始化检查
```sql
-- 检查 agents 表是否创建
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'agents';

-- 检查默认 Agent 是否存在
SELECT * FROM agents WHERE is_default = true;
```

---

## 1. 后端 API 测试用例

### 1.1 获取默认 Agent

| 用例编号 | 测试项 | 请求 | 预期结果 |
|---------|-------|------|---------|
| API-001 | 获取默认 Agent | `GET /api/agents/default` | 返回 200，包含 id="default_agent" 的系统 Agent |
| API-002 | 默认 Agent 字段验证 | `GET /api/agents/default` | 包含：name, description, system_prompt, type=system, is_default=true |

**curl 测试命令：**
```bash
curl -X GET http://localhost:8890/api/agents/default \
  -H "Content-Type: application/json" \
  -v
```

**预期响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "default_agent",
    "name": "通用助手",
    "description": "一个帮助用户解答各种问题的 AI 助手",
    "system_prompt": "...",
    "type": "system",
    "is_default": true
  }
}
```

---

### 1.2 获取 Agent 列表

| 用例编号 | 测试项 | 请求 | 预期结果 |
|---------|-------|------|---------|
| API-003 | 获取 Agent 列表（空） | `GET /api/agents` | 返回 200，data 至少包含默认 Agent |
| API-004 | 获取 Agent 列表（有数据） | `GET /api/agents` | 返回所有非删除的 Agent，按 is_default DESC, created_at DESC 排序 |

**curl 测试命令：**
```bash
curl -X GET http://localhost:8890/api/agents \
  -H "Content-Type: application/json" \
  -v
```

---

### 1.3 创建 Agent

| 用例编号 | 测试项 | 请求 | 预期结果 |
|---------|-------|------|---------|
| API-005 | 创建私有 Agent | `POST /api/agents` + valid data | 返回 201，Agent 创建成功，包含生成的 UUID |
| API-006 | 创建公开 Agent | `POST /api/agents` + type=public | 返回 201，type 为 public |
| API-007 | 名称缺失 | `POST /api/agents` + 无 name | 返回 400，错误提示 |
| API-008 | 描述缺失 | `POST /api/agents` + 无 description | 返回 400，错误提示 |
| API-009 | 类型无效 | `POST /api/agents` + type=invalid | 返回 400，错误提示 |
| API-010 | 名称超长 | `POST /api/agents` + name(101字符) | 返回 400 或 422 |
| API-011 | 描述超长 | `POST /api/agents` + description(501字符) | 返回 400 或 422 |

**curl 测试命令：**
```bash
# 创建私有 Agent
curl -X POST http://localhost:8890/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "代码助手",
    "description": "专门帮助用户编写和调试代码的 AI 助手",
    "type": "private"
  }' \
  -v

# 创建公开 Agent
curl -X POST http://localhost:8890/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "英语老师",
    "description": "帮助用户学习英语的 AI 老师",
    "type": "public"
  }' \
  -v
```

**验证点：**
- 返回的 Agent 包含自动生成的 UUID 作为 id
- system_prompt 自动生成，包含用户输入的 description
- type 字段正确设置

---

### 1.4 获取单个 Agent

| 用例编号 | 测试项 | 请求 | 预期结果 |
|---------|-------|------|---------|
| API-012 | 获取存在的 Agent | `GET /api/agents/{id}` | 返回 200，Agent 详情 |
| API-013 | 获取不存在的 Agent | `GET /api/agents/invalid-id` | 返回 404，Agent 不存在 |

**curl 测试命令：**
```bash
# 获取默认 Agent（使用已知 ID）
curl -X GET http://localhost:8890/api/agents/default_agent \
  -H "Content-Type: application/json" \
  -v

# 获取不存在的 Agent
curl -X GET http://localhost:8890/api/agents/non-existent-id \
  -H "Content-Type: application/json" \
  -v
```

---

### 1.5 更新 Agent

| 用例编号 | 测试项 | 请求 | 预期结果 |
|---------|-------|------|---------|
| API-014 | 更新私有 Agent | `PUT /api/agents/{id}` + valid data | 返回 200，Agent 更新成功 |
| API-015 | 更新系统 Agent | `PUT /api/agents/default_agent` | 返回 400，系统 Agent 不能编辑 |
| API-016 | 更新其他用户的 Agent | `PUT /api/agents/{other_agent_id}` | 返回 400，无权编辑 |
| API-017 | 更新不存在的 Agent | `PUT /api/agents/invalid-id` | 返回 404 |

**curl 测试命令：**
```bash
# 先创建一个 Agent，然后更新它
AGENT_ID="<创建后返回的 id>"

curl -X PUT http://localhost:8890/api/agents/$AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "代码助手（已更新）",
    "description": "更新后的描述"
  }' \
  -v

# 尝试更新系统 Agent（应该失败）
curl -X PUT http://localhost:8890/api/agents/default_agent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "试图修改系统 Agent",
    "description": "这应该失败"
  }' \
  -v
```

---

### 1.6 删除 Agent

| 用例编号 | 测试项 | 请求 | 预期结果 |
|---------|-------|------|---------|
| API-018 | 删除私有 Agent | `DELETE /api/agents/{id}` | 返回 200，Agent 被软删除 |
| API-019 | 删除系统 Agent | `DELETE /api/agents/default_agent` | 返回 400，系统 Agent 不能删除 |
| API-020 | 删除其他用户的 Agent | `DELETE /api/agents/{other_agent_id}` | 返回 400，无权删除 |
| API-021 | 删除不存在的 Agent | `DELETE /api/agents/invalid-id` | 返回 400 或 404 |
| API-022 | 删除已删除的 Agent | `DELETE /api/agents/{deleted_id}` | 返回 400，Agent 不存在 |

**curl 测试命令：**
```bash
# 先创建一个 Agent，然后删除它
AGENT_ID="<创建后返回的 id>"

curl -X DELETE http://localhost:8890/api/agents/$AGENT_ID \
  -H "Content-Type: application/json" \
  -v

# 验证软删除 - Agent 不应在列表中出现
curl -X GET http://localhost:8890/api/agents \
  -H "Content-Type: application/json" \
  -v

# 数据库验证
# SELECT * FROM agents WHERE id = '$AGENT_ID'; -- deleted_at 应该有值
```

---

## 2. 前端功能测试用例

### 2.1 Agent 管理页面

| 用例编号 | 测试项 | 操作步骤 | 预期结果 |
|---------|-------|---------|---------|
| UI-001 | 访问 Agent 管理页面 | 导航到 `/agents` | 页面正常加载，显示标题"Agent 管理" |
| UI-002 | 空状态显示 | 清空数据库后访问 | 显示空状态提示和"创建 Agent"按钮 |
| UI-003 | Agent 列表显示 | 存在多个 Agent | 以卡片网格形式展示，默认 Agent 排在最前 |
| UI-004 | 类型徽章显示 | 查看 Agent 卡片 | 系统/公开/私有类型有不同颜色的徽章 |
| UI-005 | 默认标记 | 查看默认 Agent | 显示"默认"徽章 |

---

### 2.2 创建 Agent

| 用例编号 | 测试项 | 操作步骤 | 预期结果 |
|---------|-------|---------|---------|
| UI-006 | 打开创建弹窗 | 点击"创建 Agent"按钮 | 弹窗正常打开，显示表单 |
| UI-007 | 表单验证 - 空 | 直接点击"创建" | 显示"请填写所有必填字段"提示 |
| UI-008 | 表单验证 - 仅名称 | 只填名称，不填描述 | 显示验证错误 |
| UI-009 | 名称字数限制 | 输入 101 个字符 | 显示字数统计 101/100 |
| UI-010 | 描述字数限制 | 输入 501 个字符 | 显示字数统计 501/500 |
| UI-011 | 类型选择 - 私有 | 点击"私有"选项 | 选项高亮，显示锁图标 |
| UI-012 | 类型选择 - 公开 | 点击"公开"选项 | 选项高亮，显示地球图标 |
| UI-013 | 创建成功 | 填写完整信息，点击创建 | 弹窗关闭，Toast 提示成功，新 Agent 出现在列表 |
| UI-014 | 创建失败 | 网络断开时创建 | Toast 提示错误信息 |

**操作步骤：**
1. 访问 `/agents` 页面
2. 点击"创建 Agent"按钮
3. 输入名称：`测试助手`
4. 输入描述：`这是一个测试用的 AI 助手`
5. 选择类型：`私有`
6. 点击"创建"按钮
7. 验证：新 Agent 出现在列表中

---

### 2.3 Agent 卡片操作

| 用例编号 | 测试项 | 操作步骤 | 预期结果 |
|---------|-------|---------|---------|
| UI-015 | 查看系统提示词预览 | 查看 Agent 卡片 | 显示截断的系统提示词预览（最多3行） |
| UI-016 | 查看创建时间 | 查看 Agent 卡片 | 显示"创建于 X 分钟前" |
| UI-017 | 编辑按钮 - 系统 Agent | 查看默认 Agent | 编辑按钮禁用或不可见 |
| UI-018 | 编辑按钮 - 私有 Agent | 查看自建 Agent | 编辑按钮可见但禁用（功能暂未开放） |
| UI-019 | 删除按钮 - 系统 Agent | 查看默认 Agent | 删除按钮禁用或不可见 |
| UI-020 | 删除按钮 - 私有 Agent | 查看自建 Agent | 删除按钮可见且可点击 |

---

### 2.4 删除 Agent

| 用例编号 | 测试项 | 操作步骤 | 预期结果 |
|---------|-------|---------|---------|
| UI-021 | 打开删除确认弹窗 | 点击 Agent 卡片的"删除"按钮 | 显示确认弹窗 |
| UI-022 | 取消删除 | 点击"取消"按钮 | 弹窗关闭，Agent 仍在列表 |
| UI-023 | 确认删除 | 点击"确认"按钮 | 弹窗关闭，Agent 从列表消失，Toast 提示成功 |
| UI-024 | 删除中状态 | 点击"确认"后观察 | 按钮显示加载状态"删除中..." |

---

### 2.5 Agent 选择器（聊天页面）

| 用例编号 | 测试项 | 操作步骤 | 预期结果 |
|---------|-------|---------|---------|
| UI-025 | 选择器显示 | 访问 `/chat` 页面 | 顶部显示 Agent 选择器 |
| UI-026 | 默认选中 | 页面首次加载 | 自动选中默认 Agent |
| UI-027 | 打开下拉列表 | 点击选择器 | 显示所有可用 Agent |
| UI-028 | 选择 Agent | 点击其他 Agent | 选择器更新为选中的 Agent |
| UI-029 | 类型图标 | 查看下拉列表 | 每个 Agent 前显示对应类型的图标 |
| UI-030 | 默认标记 | 查看下拉列表 | 默认 Agent 后显示"默认"文字 |

---

## 3. 系统提示词生成测试

| 用例编号 | 测试项 | 输入描述 | 验证点 |
|---------|-------|---------|--------|
| PROMPT-001 | 代码助手 | "专门帮助用户编写和调试代码的 AI 助手" | 包含角色定义和行为准则 |
| PROMPT-002 | 英语老师 | "帮助用户学习英语的 AI 老师" | 包含角色定义和行为准则 |
| PROMPT-003 | 营销专家 | "擅长撰写营销文案的 AI 专家" | 包含角色定义和行为准则 |

**验证命令：**
```bash
# 创建 Agent 后获取详情
curl -X GET http://localhost:8890/api/agents/<agent_id> | jq '.data.system_prompt'
```

**预期生成的系统提示词格式：**
```
你是一个专业的 AI 助手，专门扮演以下角色：

【角色定义】
<用户输入的描述>

【行为准则】
1. 始终保持友好和专业的态度
2. 严格遵循角色定义中的要求
3. 不接受超出角色范围的请求
4. 如有不确定，礼貌地向用户澄清
```

---

## 4. 边界条件和异常测试

| 用例编号 | 测试项 | 测试场景 | 预期结果 |
|---------|-------|---------|---------|
| EDGE-001 | 并发创建 | 同时发送多个创建请求 | 所有请求正常处理，ID 不重复 |
| EDGE-002 | 大量 Agent | 创建 100+ Agent | 列表分页正常（如有分页） |
| EDGE-003 | 特殊字符名称 | 名称包含 `<script>"&<>` | 名称正常保存，XSS 防护 |
| EDGE-004 | 超长描述 | 描述包含 10000 字符 | 正常处理或返回 400 |
| EDGE-005 | 数据库连接断开 | DB 停止时发起请求 | 返回 500 或 503 |
| EDGE-006 | 服务未启动 | agent-service 停止 | API Gateway 返回 503 |

---

## 5. 性能测试（可选）

| 用例编号 | 测试项 | 测试方法 | 验收标准 |
|---------|-------|---------|---------|
| PERF-001 | 列表响应时间 | `ab -n 1000 -c 10 /api/agents` | 平均响应时间 < 100ms |
| PERF-002 | 创建响应时间 | 连续创建 100 个 Agent | 每个请求 < 200ms |

---

## 6. 测试检查清单

### 后端 API
- [ ] API-001: 获取默认 Agent
- [ ] API-002: 默认 Agent 字段验证
- [ ] API-003: 获取 Agent 列表（空）
- [ ] API-004: 获取 Agent 列表（有数据）
- [ ] API-005: 创建私有 Agent
- [ ] API-006: 创建公开 Agent
- [ ] API-007: 名称缺失
- [ ] API-008: 描述缺失
- [ ] API-009: 类型无效
- [ ] API-010: 名称超长
- [ ] API-011: 描述超长
- [ ] API-012: 获取存在的 Agent
- [ ] API-013: 获取不存在的 Agent
- [ ] API-014: 更新私有 Agent
- [ ] API-015: 更新系统 Agent（应失败）
- [ ] API-016: 更新其他用户的 Agent（应失败）
- [ ] API-017: 更新不存在的 Agent
- [ ] API-018: 删除私有 Agent
- [ ] API-019: 删除系统 Agent（应失败）
- [ ] API-020: 删除其他用户的 Agent（应失败）
- [ ] API-021: 删除不存在的 Agent
- [ ] API-022: 删除已删除的 Agent

### 前端 UI
- [ ] UI-001: 访问 Agent 管理页面
- [ ] UI-002: 空状态显示
- [ ] UI-003: Agent 列表显示
- [ ] UI-004: 类型徽章显示
- [ ] UI-005: 默认标记
- [ ] UI-006: 打开创建弹窗
- [ ] UI-007: 表单验证 - 空
- [ ] UI-008: 表单验证 - 仅名称
- [ ] UI-009: 名称字数限制
- [ ] UI-010: 描述字数限制
- [ ] UI-011: 类型选择 - 私有
- [ ] UI-012: 类型选择 - 公开
- [ ] UI-013: 创建成功
- [ ] UI-014: 创建失败
- [ ] UI-015: 查看系统提示词预览
- [ ] UI-016: 查看创建时间
- [ ] UI-017: 编辑按钮 - 系统 Agent
- [ ] UI-018: 编辑按钮 - 私有 Agent
- [ ] UI-019: 删除按钮 - 系统 Agent
- [ ] UI-020: 删除按钮 - 私有 Agent
- [ ] UI-021: 打开删除确认弹窗
- [ ] UI-022: 取消删除
- [ ] UI-023: 确认删除
- [ ] UI-024: 删除中状态
- [ ] UI-025: 选择器显示
- [ ] UI-026: 默认选中
- [ ] UI-027: 打开下拉列表
- [ ] UI-028: 选择 Agent
- [ ] UI-029: 类型图标
- [ ] UI-030: 默认标记

---

## 7. 快速测试脚本

```bash
#!/bin/bash
# Agent API 快速测试

BASE_URL="http://localhost:8890"

echo "=== Agent API 测试 ==="

# 1. 获取默认 Agent
echo -e "\n1. 获取默认 Agent"
curl -s -X GET $BASE_URL/api/agents/default | jq '.'

# 2. 获取 Agent 列表
echo -e "\n2. 获取 Agent 列表"
curl -s -X GET $BASE_URL/api/agents | jq '.'

# 3. 创建私有 Agent
echo -e "\n3. 创建私有 Agent"
PRIVATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"代码助手","description":"专门帮助用户编写和调试代码的 AI 助手","type":"private"}')
echo $PRIVATE_RESPONSE | jq '.'

PRIVATE_ID=$(echo $PRIVATE_RESPONSE | jq -r '.data.id')

# 4. 获取单个 Agent
echo -e "\n4. 获取刚创建的 Agent: $PRIVATE_ID"
curl -s -X GET $BASE_URL/api/agents/$PRIVATE_ID | jq '.'

# 5. 更新 Agent
echo -e "\n5. 更新 Agent"
curl -s -X PUT $BASE_URL/api/agents/$PRIVATE_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"代码助手（已更新）","description":"更新后的描述"}' | jq '.'

# 6. 创建公开 Agent
echo -e "\n6. 创建公开 Agent"
PUBLIC_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"英语老师","description":"帮助用户学习英语的 AI 老师","type":"public"}')
echo $PUBLIC_RESPONSE | jq '.'

PUBLIC_ID=$(echo $PUBLIC_RESPONSE | jq -r '.data.id')

# 7. 尝试删除系统 Agent（应失败）
echo -e "\n7. 尝试删除系统 Agent（应失败）"
curl -s -X DELETE $BASE_URL/api/agents/default_agent | jq '.'

# 8. 删除私有 Agent
echo -e "\n8. 删除私有 Agent: $PRIVATE_ID"
curl -s -X DELETE $BASE_URL/api/agents/$PRIVATE_ID | jq '.'

# 9. 验证删除后的列表
echo -e "\n9. 验证删除后的列表"
curl -s -X GET $BASE_URL/api/agents | jq '.data[] | {id, name, type}'

# 10. 清理：删除公开 Agent
echo -e "\n10. 清理：删除公开 Agent"
curl -s -X DELETE $BASE_URL/api/agents/$PUBLIC_ID | jq '.'

echo -e "\n=== 测试完成 ==="
```

保存为 `test_agent_api.sh`，运行：`chmod +x test_agent_api.sh && ./test_agent_api.sh`
