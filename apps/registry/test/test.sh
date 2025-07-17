#!/bin/bash

# 注册中心测试脚本
REGISTRY_URL="http://localhost:8820"

# 检查 jq 是否可用
if command -v jq >/dev/null 2>&1; then
  JQ="jq ."
else
  echo "[警告] 未检测到 jq，输出为原始 JSON。建议安装 jq 获得更美观的输出。"
  JQ="cat"
fi

step() {
  echo -e "\n=============================="
  echo -e "$1"
  echo "------------------------------"
}

step "1. 测试健康检查"
curl -s "$REGISTRY_URL/health" | $JQ

step "2. 注册 auth-service"
curl -s -X POST "$REGISTRY_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "auth-service",
    "address": "localhost",
    "port": 8081,
    "tags": ["api", "auth"],
    "meta": {
      "version": "1.0.0",
      "environment": "development"
    }
  }' | $JQ

step "3. 注册第二个 auth-service 实例"
curl -s -X POST "$REGISTRY_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "auth-service",
    "address": "localhost",
    "port": 8082,
    "tags": ["api", "auth"],
    "meta": {
      "version": "1.0.0",
      "environment": "development"
    }
  }' | $JQ

step "4. 注册 user-service"
curl -s -X POST "$REGISTRY_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "address": "localhost",
    "port": 8083,
    "tags": ["api", "user"],
    "meta": {
      "version": "1.0.0",
      "environment": "development"
    }
  }' | $JQ

step "5. 查询 auth-service 列表"
curl -s "$REGISTRY_URL/services?name=auth-service" | $JQ

step "6. 发现 auth-service"
curl -s "$REGISTRY_URL/discover/auth-service" | $JQ

step "7. 查询 user-service 列表"
curl -s "$REGISTRY_URL/services?name=user-service" | $JQ

step "8. 获取服务统计"
curl -s "$REGISTRY_URL/stats" | $JQ

step "9. 注销一个 auth-service 实例"
SERVICE_ID=$(curl -s "$REGISTRY_URL/services?name=auth-service" | jq -r '.services[0].id')
curl -s -X DELETE "$REGISTRY_URL/unregister/$SERVICE_ID" | $JQ

step "10. 再次查询 auth-service 列表"
curl -s "$REGISTRY_URL/services?name=auth-service" | $JQ

echo -e "\n✅ 测试完成！" 