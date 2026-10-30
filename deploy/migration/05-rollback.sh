#!/usr/bin/env bash
# 05-rollback.sh —— 回滚到旧机（DNS 切回 + 核对）
# 用法：在任意能跑 dig/curl 的机器上执行；参数为旧机 IP。
# 前提：旧机保持运行（本方案要求观察期 ≥7 天内不退订不清理）。
set -euo pipefail

OLD_IP="${1:?用法: $0 <旧机IP>，例如 $0 211.159.161.34}"
DOMAIN="${DOMAIN:-telos.indulgeback.icu}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "回滚目标: $DOMAIN -> $OLD_IP"

# ---- 1) 确认旧机服务仍然健康（SSH 到旧机核对）----
log "请在旧机上确认（或走已有 SSH）："
log "  docker ps --format '{{.Names}} {{.Status}}' | grep -E 'telos|safeline'"
log "  curl -s -o /dev/null -w '%{http_code}\\n' http://localhost:8800/zh"

# ---- 2) DNS 切回 ----
# DNSPod API 方式（推荐，秒级生效）：
#   需要在 DNSPod 控制台创建 API Token（DNSPOD_TOKEN_ID / DNSPOD_TOKEN_KEY），然后：
#   curl -s https://dnsapi.cn/Record.Modify -d "login_token=$DNSPOD_TOKEN_ID,$DNSPOD_TOKEN_KEY" \
#     -d "format=json" -d "domain=indulgeback.icu" -d "record_id=<记录ID>" \
#     -d "value=$OLD_IP" -d "record_line_id=0"
# 手动方式：DNSPod 控制台 -> 域名解析 -> telos A 记录 -> 改为 $OLD_IP（TTL 已是 60s）
log "DNS 操作（二选一）：DNSPod 控制台手动改 A 记录，或用上方 API。"
read -r -p "完成 DNS 切回后按回车继续验证..."

# ---- 3) 生效验证 ----
log "等待 DNS 生效（TTL 60s）..."
sleep 70
current=$(dig +short "$DOMAIN" | tail -1)
if [[ "$current" == "$OLD_IP" ]]; then
  log "✓ DNS 已指向旧机 ($current)"
else
  log "⚠ dig 得到: $current（可能是本地缓存，用公共 DNS 再查: dig @119.29.29.29 +short $DOMAIN）"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAIN/zh" || echo 000)
if [[ "$code" == "200" ]]; then
  log "✓ https://$DOMAIN/zh 返回 200，回滚完成"
else
  log "✗ 站点返回 $code——检查旧机 SafeLine/tengine 与容器状态"
  exit 1
fi

log "回滚收尾提醒："
log "  1) 新机上的 Telos 可以留着（不接收流量）待排查，或 docker compose down"
log "  2) 排查 04-verify-all.sh 的失败项后重新走 03→04→切 DNS"
