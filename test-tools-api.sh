#!/bin/bash

# ============================================================
# 工具插件系统 API 测试脚本
# ============================================================
# 网关地址
GATEWAY_URL="http://localhost:8890"

# 默认 Agent ID (来自 system seed)
AGENT_ID="default_agent"

# 预置工具 ID
TOOL_READER_ID="jina-reader"
TOOL_SEARCH_ID="jina-search"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_section() {
    echo -e "\n${YELLOW}========== $1 ==========${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ============================================================
# 1. 健康检查
# ============================================================
print_section "1. 健康检查"
echo "GET ${GATEWAY_URL}/ping"
curl -s "${GATEWAY_URL}/ping" && print_success "网关健康检查通过" || print_error "网关未响应"
echo ""

# ============================================================
# 2. 列出所有工具
# ============================================================
print_section "2. 列出所有工具 (GET /api/tools)"
echo "请求: GET ${GATEWAY_URL}/api/tools"
TOOLS_RESPONSE=$(curl -s "${GATEWAY_URL}/api/tools")
echo "$TOOLS_RESPONSE" | jq '.'

# 检查预置工具是否存在
if echo "$TOOLS_RESPONSE" | jq -e '.tools[] | select(.id == "jina-reader")' > /dev/null; then
    print_success "jina-reader 工具已存在"
else
    print_error "jina-reader 工具未找到"
fi

if echo "$TOOLS_RESPONSE" | jq -e '.tools[] | select(.id == "jina-search")' > /dev/null; then
    print_success "jina-search 工具已存在"
else
    print_error "jina-search 工具未找到"
fi

# ============================================================
# 3. 获取工具详情
# ============================================================
print_section "3. 获取工具详情 (GET /api/tools/:id)"
echo "请求: GET ${GATEWAY_URL}/api/tools/${TOOL_READER_ID}"
curl -s "${GATEWAY_URL}/api/tools/${TOOL_READER_ID}" | jq '.'

# ============================================================
# 4. 获取 Agent 的工具列表
# ============================================================
print_section "4. 获取 Agent 的工具列表 (GET /api/agents/:id/tools)"
echo "Agent ID: ${AGENT_ID}"
echo "请求: GET ${GATEWAY_URL}/api/agents/${AGENT_ID}/tools"
AGENT_TOOLS=$(curl -s "${GATEWAY_URL}/api/agents/${AGENT_ID}/tools")
echo "$AGENT_TOOLS" | jq '.'

# ============================================================
# 5. 为 Agent 设置工具
# ============================================================
print_section "5. 为 Agent 设置工具 (PUT /api/agents/:id/tools)"
echo "将 jina-reader 和 jina-search 添加到默认 Agent"
echo "请求: PUT ${GATEWAY_URL}/api/agents/${AGENT_ID}/tools"
SET_TOOLS_RESPONSE=$(curl -s -X PUT "${GATEWAY_URL}/api/agents/${AGENT_ID}/tools" \
    -H "Content-Type: application/json" \
    -d "{
        \"tool_ids\": [\"${TOOL_READER_ID}\", \"TOOL_SEARCH_ID\"]
    }")
echo "$SET_TOOLS_RESPONSE" | jq '.'

# ============================================================
# 6. 再次验证 Agent 的工具
# ============================================================
print_section "6. 验证 Agent 的工具已配置"
echo "请求: GET ${GATEWAY_URL}/api/agents/${AGENT_ID}/tools"
curl -s "${GATEWAY_URL}/api/agents/${AGENT_ID}/tools" | jq '.'

# ============================================================
# 7. 切换工具启用状态
# ============================================================
print_section "7. 禁用工具 (PATCH /api/agents/:id/tools/:tool_id/toggle)"
echo "请求: PATCH ${GATEWAY_URL}/api/agents/${AGENT_ID}/tools/${TOOL_READER_ID}/toggle"
TOGGLE_RESPONSE=$(curl -s -X PATCH "${GATEWAY_URL}/api/agents/${AGENT_ID}/tools/${TOOL_READER_ID}/toggle" \
    -H "Content-Type: application/json" \
    -d '{
        "enabled": false
    }')
echo "$TOGGLE_RESPONSE" | jq '.'

# ============================================================
# 8. 重新启用工具
# ============================================================
print_section "8. 重新启用工具"
echo "请求: PATCH ${GATEWAY_URL}/api/agents/${AGENT_ID}/tools/${TOOL_READER_ID}/toggle"
TOGGLE_RESPONSE=$(curl -s -X PATCH "${GATEWAY_URL}/api/agents/${AGENT_ID}/tools/${TOOL_READER_ID}/toggle" \
    -H "Content-Type: application/json" \
    -d '{
        "enabled": true
    }')
echo "$TOGGLE_RESPONSE" | jq '.'

# ============================================================
# 9. 创建自定义工具 (测试)
# ============================================================
print_section "9. 创建自定义工具 (POST /api/tools)"
echo "创建一个天气查询工具示例"
CREATE_TOOL_RESPONSE=$(curl -s -X POST "${GATEWAY_URL}/api/tools" \
    -H "Content-Type: application/json" \
    -d '{
        "id": "weather-test",
        "name": "get_weather",
        "type": "invokable",
        "display_name": "天气查询测试",
        "description": "查询指定城市的实时天气信息",
        "category": "test",
        "endpoint": {
            "url_template": "https://wttr.in/{city}?format=j1",
            "method": "GET",
            "headers": {},
            "timeout": 10
        },
        "parameters": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称",
                    "required": true
                }
            },
            "required": ["city"]
        },
        "response_transform": {
            "extract": "$",
            "format": "json"
        },
        "enabled": true
    }')
echo "$CREATE_TOOL_RESPONSE" | jq '.'

# ============================================================
# 10. 验证新创建的工具
# ============================================================
print_section "10. 验证新创建的工具"
echo "请求: GET ${GATEWAY_URL}/api/tools/weather-test"
curl -s "${GATEWAY_URL}/api/tools/weather-test" | jq '.'

# ============================================================
# 11. 更新工具
# ============================================================
print_section "11. 更新工具 (PUT /api/tools/:id)"
echo "更新天气工具描述"
UPDATE_TOOL_RESPONSE=$(curl -s -X PUT "${GATEWAY_URL}/api/tools/weather-test" \
    -H "Content-Type: application/json" \
    -d '{
        "id": "weather-test",
        "name": "get_weather",
        "type": "invokable",
        "display_name": "天气查询测试 (已更新)",
        "description": "查询指定城市的实时天气信息 - 支持全球城市",
        "category": "test",
        "endpoint": {
            "url_template": "https://wttr.in/{city}?format=j1",
            "method": "GET",
            "headers": {},
            "timeout": 10
        },
        "parameters": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称",
                    "required": true
                }
            },
            "required": ["city"]
        },
        "response_transform": {
            "extract": "$",
            "format": "json"
        },
        "enabled": true
    }')
echo "$UPDATE_TOOL_RESPONSE" | jq '.'

# ============================================================
# 12. 删除测试工具
# ============================================================
print_section "12. 删除测试工具 (DELETE /api/tools/:id)"
echo "请求: DELETE ${GATEWAY_URL}/api/tools/weather-test"
DELETE_RESPONSE=$(curl -s -X DELETE "${GATEWAY_URL}/api/tools/weather-test")
echo "$DELETE_RESPONSE"

# ============================================================
# 13. 工具过滤测试
# ============================================================
print_section "13. 工具过滤测试"
echo "按分类筛选: GET ${GATEWAY_URL}/api/tools?category=web"
curl -s "${GATEWAY_URL}/api/tools?category=web" | jq '.tools[] | {id, name, category}'

echo -e "\n按启用状态筛选: GET ${GATEWAY_URL}/api/tools?enabled=true"
curl -s "${GATEWAY_URL}/api/tools?enabled=true" | jq '.tools[] | {id, name, enabled}'

echo -e "\n搜索工具: GET ${GATEWAY_URL}/api/tools?search=jina"
curl -s "${GATEWAY_URL}/api/tools?search=jina" | jq '.tools[] | {id, name, display_name}'

# ============================================================
# 测试完成
# ============================================================
print_section "测试完成!"
echo "如果所有测试都通过，说明工具插件系统 API 工作正常。"
