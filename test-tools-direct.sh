#!/bin/bash

# ============================================================
# 工具插件系统 API 测试脚本 - 直连 Agent Service
# ============================================================
# Agent Service 直连地址
AGENT_URL="http://localhost:8001"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
print_section "1. Agent Service 健康检查"
echo "GET ${AGENT_URL}/health"
curl -s "${AGENT_URL}/health" && print_success "Agent Service 健康检查通过" || print_error "Agent Service 未响应"
echo ""

# ============================================================
# 2. 就绪检查
# ============================================================
print_section "2. 就绪检查"
echo "GET ${AGENT_URL}/ready"
curl -s "${AGENT_URL}/ready" | jq '.'

# ============================================================
# 3. 服务信息
# ============================================================
print_section "3. 服务信息"
echo "GET ${AGENT_URL}/info"
curl -s "${AGENT_URL}/info" | jq '.'

# ============================================================
# 4. 列出所有工具
# ============================================================
print_section "4. 列出所有工具 (GET /api/tools)"
echo "请求: GET ${AGENT_URL}/api/tools"
TOOLS_RESPONSE=$(curl -s "${AGENT_URL}/api/tools")
echo "$TOOLS_RESPONSE" | jq '.'

# ============================================================
# 5. 获取工具详情
# ============================================================
print_section "5. 获取工具详情 - Jina Reader"
echo "请求: GET ${AGENT_URL}/api/tools/jina-reader"
curl -s "${AGENT_URL}/api/tools/jina-reader" | jq '.'

print_section "获取工具详情 - Jina Search"
echo "请求: GET ${AGENT_URL}/api/tools/jina-search"
curl -s "${AGENT_URL}/api/tools/jina-search" | jq '.'

# ============================================================
# 6. 创建自定义工具
# ============================================================
print_section "6. 创建测试工具"
echo "创建一个简单的 Hello World 工具"
CREATE_TOOL=$(curl -s -X POST "${AGENT_URL}/api/tools" \
    -H "Content-Type: application/json" \
    -d '{
        "id": "hello-test",
        "name": "hello_world",
        "type": "invokable",
        "display_name": "Hello 测试工具",
        "description": "一个简单的测试工具",
        "category": "test",
        "endpoint": {
            "url_template": "https://httpbin.org/anything?msg={message}",
            "method": "GET",
            "headers": {
                "User-Agent": "Telos-Tool-Test/1.0"
            },
            "timeout": 10
        },
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "要发送的消息",
                    "required": true
                }
            },
            "required": ["message"]
        },
        "response_transform": {
            "extract": "$",
            "format": "json"
        },
        "enabled": true
    }')
echo "$CREATE_TOOL" | jq '.'

# ============================================================
# 7. 获取默认 Agent 的工具
# ============================================================
print_section "7. 获取默认 Agent 的工具列表"
echo "请求: GET ${AGENT_URL}/api/agents/default_agent/tools"
curl -s "${AGENT_URL}/api/agents/default_agent/tools" | jq '.'

# ============================================================
# 8. 为默认 Agent 设置工具
# ============================================================
print_section "8. 为默认 Agent 设置工具"
echo "将 jina-reader 和 hello-test 工具添加到默认 Agent"
SET_TOOLS=$(curl -s -X PUT "${AGENT_URL}/api/agents/default_agent/tools" \
    -H "Content-Type: application/json" \
    -d '{
        "tool_ids": ["jina-reader", "jina-search", "hello-test"]
    }')
echo "$SET_TOOLS" | jq '.'

# ============================================================
# 9. 验证 Agent 工具配置
# ============================================================
print_section "9. 验证 Agent 工具已配置"
echo "请求: GET ${AGENT_URL}/api/agents/default_agent/tools"
curl -s "${AGENT_URL}/api/agents/default_agent/tools" | jq '.'

# ============================================================
# 10. 切换工具状态
# ============================================================
print_section "10. 禁用 hello-test 工具"
echo "请求: PATCH ${AGENT_URL}/api/agents/default_agent/tools/hello-test/toggle"
curl -s -X PATCH "${AGENT_URL}/api/agents/default_agent/tools/hello-test/toggle" \
    -H "Content-Type: application/json" \
    -d '{"enabled": false}' | jq '.'

print_section "重新启用 hello-test 工具"
echo "请求: PATCH ${AGENT_URL}/api/agents/default_agent/tools/hello-test/toggle"
curl -s -X PATCH "${AGENT_URL}/api/agents/default_agent/tools/hello-test/toggle" \
    -H "Content-Type: application/json" \
    -d '{"enabled": true}' | jq '.'

# ============================================================
# 11. 工具过滤测试
# ============================================================
print_section "11. 工具过滤测试"

echo -e "\n[按分类筛选] category=test:"
curl -s "${AGENT_URL}/api/tools?category=test" | jq '.tools[] | {id, name, category}'

echo -e "\n[按启用状态筛选] enabled=true:"
curl -s "${AGENT_URL}/api/tools?enabled=true" | jq '.tools[] | {id, name, enabled}'

echo -e "\n[搜索工具] search=hello:"
curl -s "${AGENT_URL}/api/tools?search=hello" | jq '.tools[] | {id, name, display_name}'

# ============================================================
# 12. 清理测试数据
# ============================================================
print_section "12. 清理测试工具"
echo "删除 hello-test 工具"
curl -s -X DELETE "${AGENT_URL}/api/tools/hello-test" && print_success "测试工具已删除"

# ============================================================
# 13. 数据库工具列表验证
# ============================================================
print_section "13. 验证预置工具"
echo "所有工具:"
curl -s "${AGENT_URL}/api/tools" | jq '.tools[] | {id, name, display_name, category}'

# ============================================================
# 测试完成
# ============================================================
print_section "测试完成!"
echo "如果所有测试都通过，说明工具插件系统工作正常。"
