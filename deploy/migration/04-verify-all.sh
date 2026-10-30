#!/usr/bin/env bash
# 04-verify-all.sh —— 逐服务验证 + 端到端冒烟
# 用法：在新机上执行（root）。可选参数 --public 走公网域名验证（DNS 切换后）。
set -euo pipefail

log() { echo "[$(date '+%H:%M:%S')] $*"; }
FAILS=0

MODE="${1:-local}"   # local = 容器/本机端口；public = 走公网域名
if [[ "$MODE" == "public" ]]; then
  BASE="https://telos.indulgeback.icu"
else
  BASE="http://localhost:8800"
  GW="http://localhost:8890"
fi

check() { # check <名称> <命令...>
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    log "✓ $name"
  else
    log "✗ $name"
    FAILS=$((FAILS + 1))
  fi
}

log "===== 容器健康 ====="
FAILS=0
for name in telos-postgres telos-redis telos-consul telos-registry \
            telos-agent-service telos-prod-agent-worker-1 telos-api-gateway \
            telos-web telos-admin-service telos-admin; do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || echo "missing")
  if [[ "$status" == "healthy" ]]; then log "✓ $name"; else log "✗ $name ($status)"; FAILS=$((FAILS+1)); fi
done

log "===== 服务就绪 ====="
check "agent-service /ready"       docker exec telos-agent-service wget -qO- -T 5 http://localhost:8895/ready
check "gateway /ping"              docker exec telos-api-gateway wget -qO- -T 5 http://localhost:8890/ping
check "web 首页 200"               curl -sf -o /dev/null http://localhost:8800/
check "SafeLine 80/443 监听"       bash -c "ss -tln | grep -q ':443 '"

log "===== 端到端冒烟（A2A 聊天）====="
cd /opt/telos
source .env
resp=$(curl -s --max-time 90 -X POST http://localhost:8890/api/a2a \
  -H "Authorization: Bearer $A2A_API_KEY" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"verify","method":"message/send","params":{"message":{"role":"user","parts":[{"kind":"text","text":"回复ok"}],"messageId":"verify","kind":"message"}}}' || true)
if echo "$resp" | grep -q '"state":"completed"'; then
  log "✓ A2A 聊天冒烟"
else
  log "✗ A2A 聊天冒烟: $(echo "$resp" | head -c 150)"
  FAILS=$((FAILS+1))
fi

if [[ "$MODE" == "public" ]]; then
  log "===== 公网验证（DNS 已切）====="
  check "公网 https 站点" curl -sf -o /dev/null https://telos.indulgeback.icu/zh
  check "公网 /api/build-id" curl -sf https://telos.indulgeback.icu/api/build-id
  cert_cn=$(echo | openssl s_client -connect telos.indulgeback.icu:443 -servername telos.indulgeback.icu 2>/dev/null | openssl x509 -noout -subject 2>/dev/null || true)
  log "TLS 证书: $cert_cn"
fi

log "===================================="
if (( FAILS > 0 )); then
  log "✗ ${FAILS} 项未通过——先修复再切 DNS"
  exit 1
fi
log "✅ 全部通过"
