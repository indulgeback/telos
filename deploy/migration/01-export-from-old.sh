#!/usr/bin/env bash
# 01-export-from-old.sh —— 旧机只读导出迁移包
# 用法：在旧机上执行。产出 /opt/migration-export/migration-<时间戳>.tar.gz
# 前提：/opt/telos/docker-compose.prod.yml、/data/safeline、/opt/mihomo、/opt/rustdesk/data 存在
set -euo pipefail

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
err()  { echo "[$(date '+%H:%M:%S')] ✗ $*" >&2; exit 1; }

EXPORT_ROOT="/opt/migration-export"
TELOS_DIR="${TELOS_DIR:-/opt/telos}"
SAFELINE_DIR="${SAFELINE_DIR:-/data/safeline}"
MIHOMO_DIR="${MIHOMO_DIR:-/opt/mihomo}"
RUSTDESK_DATA="${RUSTDESK_DATA:-/opt/rustdesk/data}"
STAMP="$(date -u +%Y%m%d%H%M%S)"
OUT_DIR="${EXPORT_ROOT}/migration-${STAMP}"

[[ -d "$TELOS_DIR" ]] || err "Telos 目录不存在: $TELOS_DIR"
[[ -f "$TELOS_DIR/docker-compose.prod.yml" ]] || err "compose 清单缺失"
[[ -f "$TELOS_DIR/.env" ]] || err ".env 缺失"

# ---- 磁盘空间预检（满盘写入会静默损坏——历史教训）----
FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
SAFELINE_MB=$(du -sm "$SAFELINE_DIR" 2>/dev/null | awk '{print $1}')
SAFELINE_MB=${SAFELINE_MB:-0}
# 预算：SafeLine*1.2 + 其他包（telos env/workspaces/secrets/mihomo/rustdesk）约 200M + DB 备份缓冲 500M
NEED_MB=$(( SAFELINE_MB * 12 / 10 + 700 ))
if (( FREE_KB / 1024 < NEED_MB )); then
  err "磁盘空间不足：需要约 ${NEED_MB}MB，仅剩 $((FREE_KB / 1024))MB。先清理再导出。"
fi
log "空间预检通过：剩余 $((FREE_KB / 1024))MB，预计需要 ${NEED_MB}MB"

mkdir -p "$OUT_DIR"

# ---- 1) Telos：先停写入，保证 DB 冷备一致 ----
log "停止 Telos 流量写入（SafeLine/rustdesk/mihomo 不动）..."
cd "$TELOS_DIR"
docker compose -f docker-compose.prod.yml stop agent-worker agent-service web admin admin-service api-gateway 2>/dev/null || \
  log "（部分服务可能已停止，继续）"
sleep 2

# ---- 2) PostgreSQL 冷备（-Fc 自定义格式，新机 pg_restore）----
log "导出 PostgreSQL..."
source "$TELOS_DIR/.env"
PG_USER="${POSTGRES_USER:-telos}"
PG_DB="${POSTGRES_DB:-telos}"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$PG_USER" -d "$PG_DB" -Fc > "$OUT_DIR/telos-db.dump"
[[ -s "$OUT_DIR/telos-db.dump" ]] || err "pg_dump 产物为空——磁盘或权限问题，中止"
chmod 600 "$OUT_DIR/telos-db.dump"
log "DB 备份: $(du -h "$OUT_DIR/telos-db.dump" | awk '{print $1}')"

# ---- 3) 配置与凭据 ----
log "打包 Telos 配置..."
mkdir -p "$OUT_DIR/telos"
cp "$TELOS_DIR/docker-compose.prod.yml" "$OUT_DIR/telos/"
cp "$TELOS_DIR/.env" "$OUT_DIR/telos/"
chmod 600 "$OUT_DIR/telos/.env"
[[ -d "$TELOS_DIR/workspaces" ]] && tar -C "$TELOS_DIR" -czf "$OUT_DIR/telos/workspaces.tgz" workspaces
[[ -f "$TELOS_DIR/secrets/gcp-adc.json" ]] && cp -r "$TELOS_DIR/secrets" "$OUT_DIR/telos/secrets"

# ---- 4) SafeLine 整目录（含 postgres 数据 + nginx 证书）----
log "打包 SafeLine（约 ${SAFELINE_MB}MB）..."
# 先停 SafeLine，保证其内置 postgres 数据一致
docker compose -f "$SAFELINE_DIR/docker-compose.yaml" --project-directory "$SAFELINE_DIR" stop 2>/dev/null || true
tar -C /data -czf "$OUT_DIR/safeline.tgz" "$(basename "$SAFELINE_DIR")"

# ---- 5) mihomo（config.yaml + 二进制）与 unit 文件 ----
log "打包 mihomo..."
tar -C "$(dirname "$MIHOMO_DIR")" -czf "$OUT_DIR/mihomo.tgz" "$(basename "$MIHOMO_DIR")"
systemctl cat mihomo > "$OUT_DIR/mihomo.service" 2>/dev/null || true

# ---- 6) rustdesk ----
if [[ -d "$RUSTDESK_DATA" ]]; then
  log "打包 rustdesk（整目录：compose + data）..."
  tar -C "$(dirname "$RUSTDESK_DATA")" -czf "$OUT_DIR/rustdesk.tgz" "$(basename "$RUSTDESK_DATA")"
fi

# ---- 7) 恢复流量：立即拉起（切换窗口前旧机要保持服务）----
log "恢复旧机服务（切换窗口时再正式停）..."
cd "$TELOS_DIR"
docker compose -f docker-compose.prod.yml start api-gateway web admin admin-service agent-service agent-worker 2>/dev/null || true
docker compose -f "$SAFELINE_DIR/docker-compose.yaml" --project-directory "$SAFELINE_DIR" start 2>/dev/null || true

# ---- 8) 打总包 + 校验和 ----
log "生成总包与校验和..."
tar -C "$EXPORT_ROOT" -czf "$EXPORT_ROOT/migration-${STAMP}.tar.gz" "migration-${STAMP}"
( cd "$EXPORT_ROOT" && sha256sum "migration-${STAMP}.tar.gz" > "migration-${STAMP}.tar.gz.sha256" )
rm -rf "$OUT_DIR"

log "✅ 导出完成: ${EXPORT_ROOT}/migration-${STAMP}.tar.gz ($(du -h "${EXPORT_ROOT}/migration-${STAMP}.tar.gz" | awk '{print $1}'))"
log "下一步：把 tar.gz 与 .sha256 传到新机（scp/rsync 经本机中转均可），然后在执行 03 前用 sha256sum -c 校验。"
log "提示：正式切换窗口时，重跑本脚本获取最新数据包，然后直接进入停机切换流程。"
