#!/usr/bin/env bash
# 03-restore-on-new.sh —— 新机恢复 + 按依赖顺序启动
# 用法：在新机上执行（root）。迁移包路径作为参数：./03-restore-on-new.sh /opt/migration.tar.gz
set -euo pipefail

log() { echo "[$(date '+%H:%M:%S')] $*"; }
err() { echo "[$(date '+%H:%M:%S')] ✗ $*" >&2; exit 1; }

PKG="${1:-}"
[[ -f "$PKG" ]] || err "用法: $0 <migration-*.tar.gz 路径>"
[[ $EUID -eq 0 ]] || err "请用 root/sudo 执行"

IMAGE_TAG="${IMAGE_TAG:-$(grep -oP '(?<=IMAGE_TAG=sha-)[0-9a-f]{7}' /dev/null 2>/dev/null || true)}"

# ---- 0) 校验和 ----
log "校验迁移包..."
( cd "$(dirname "$PKG")" && sha256sum -c "$(basename "$PKG").sha256" )

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
tar -xzf "$PKG" -C "$WORK"
INNER=$(ls -d "$WORK"/migration-*)
[[ -d "$INNER" ]] || err "包结构异常"

# ---- 1) mihomo（新机出网依赖，最先恢复）----
log "恢复 mihomo..."
if [[ -f "$INNER/mihomo.tgz" ]]; then
  tar -xzf "$INNER/mihomo.tgz" -C /opt/
  [[ -f "$INNER/mihomo.service" ]] && cp "$INNER/mihomo.service" /etc/systemd/system/mihomo.service
  systemctl daemon-reload
  systemctl enable --now mihomo
  sleep 2
  systemctl is-active mihomo >/dev/null || err "mihomo 启动失败"
  log "mihomo active"
fi

# ---- 2) Telos 配置/凭据/workspaces ----
log "恢复 Telos 配置..."
mkdir -p /opt/telos
cp "$INNER/telos/docker-compose.prod.yml" /opt/telos/
cp "$INNER/telos/.env" /opt/telos/
chmod 600 /opt/telos/.env
[[ -f "$INNER/telos/workspaces.tgz" ]] && tar -xzf "$INNER/telos/workspaces.tgz" -C /opt/telos/
[[ -d "$INNER/telos/secrets" ]] && cp -r "$INNER/telos/secrets" /opt/telos/

# ---- 3) 拉镜像（ghcr；失败时提示 relay-image.yml 或 docker load）----
source /opt/telos/.env
# compose 里 WORKSPACE_SHARE_BASE_URL 是 :? 必填插值；旧 .env 若未含则从
# NEXT_PUBLIC_API_URL 兜底（与 deploy.sh 行为一致）
export WORKSPACE_SHARE_BASE_URL="${WORKSPACE_SHARE_BASE_URL:-${NEXT_PUBLIC_API_URL:-}}"
IMAGE_TAG="${IMAGE_TAG:-sha-c382928}"
SERVICES=(web agent-service api-gateway registry admin admin-service)
log "拉取镜像 (tag: $IMAGE_TAG)..."
PULL_OK=true
for svc in "${SERVICES[@]}"; do
  docker pull "ghcr.io/indulgeback/telos-${svc}:${IMAGE_TAG}" >/dev/null 2>&1 || { PULL_OK=false; log "⚠ ${svc} 拉取失败"; }
done
if [[ "$PULL_OK" != "true" ]]; then
  log "⚠ ghcr 部分失败。两条路：① 触发 .github/workflows/relay-image.yml 中继后 docker load；② 在旧机 docker save 打包传过来 load。"
  log "  （也可以现在忽略——compose 会只起已有镜像的服务，其余稍后补齐）"
fi
# pgvector/redis/consul 是公共镜像，单独拉
docker pull pgvector/pgvector:pg16 >/dev/null 2>&1 || log "⚠ pgvector 镜像拉取失败"
docker pull redis:7-alpine >/dev/null 2>&1 || true
docker pull hashicorp/consul:1.18 >/dev/null 2>&1 || true

# ---- 4) restore DB（先只起 postgres）----
log "启动 postgres 并恢复数据库..."
cd /opt/telos
IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml up -d --pull never postgres
sleep 5
for i in $(seq 1 30); do
  docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-telos}" >/dev/null 2>&1 && break
  sleep 2
done
docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-telos}" >/dev/null \
  || err "postgres 未就绪"
cat "$INNER/telos-db.dump" | docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "${POSTGRES_USER:-telos}" -d "${POSTGRES_DB:-telos}" --clean --if-exists
log "数据库恢复完成"

# ---- 5) 按依赖顺序启动 + 健康门禁 ----
wait_healthy() {
  local name="$1" timeout="${2:-120}"
  log "等待 $name healthy（最多 ${timeout}s）..."
  for _ in $(seq 1 $((timeout / 5))); do
    [[ "$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null)" == "healthy" ]] && { log "  $name healthy"; return 0; }
    sleep 5
  done
  err "$name 健康检查超时——查看 docker logs $name"
}
DC="docker compose -f docker-compose.prod.yml"
export IMAGE_TAG
IMAGE_TAG="$IMAGE_TAG" $DC up -d --pull never redis consul
wait_healthy telos-redis 60
wait_healthy telos-consul 60
IMAGE_TAG="$IMAGE_TAG" $DC up -d --pull never registry
wait_healthy telos-registry 120
IMAGE_TAG="$IMAGE_TAG" $DC up -d --pull never agent-worker agent-service
wait_healthy telos-agent-service 120
wait_healthy telos-prod-agent-worker-1 120
IMAGE_TAG="$IMAGE_TAG" $DC up -d --pull never api-gateway
wait_healthy telos-api-gateway 120
IMAGE_TAG="$IMAGE_TAG" $DC up -d --pull never web admin-service admin
wait_healthy telos-web 120
wait_healthy telos-admin-service 60
wait_healthy telos-admin 60

# ---- 6) SafeLine（最后接流量）----
if [[ -f "$INNER/safeline.tgz" ]]; then
  log "恢复 SafeLine..."
  tar -xzf "$INNER/safeline.tgz" -C /data/
  docker compose -f /data/safeline/docker-compose.yaml --project-directory /data/safeline up -d
  log "SafeLine 已启动（tengine 监听 80/443）"
fi

# ---- 7) rustdesk ----
if [[ -f "$INNER/rustdesk.tgz" ]]; then
  log "恢复 rustdesk（host 网络模式，端口 21115-21119）..."
  tar -xzf "$INNER/rustdesk.tgz" -C /opt/
  docker compose -f /opt/rustdesk/docker-compose.yml --project-directory /opt/rustdesk up -d \
    || log "⚠ rustdesk 拉起失败，手动检查 /opt/rustdesk/docker-compose.yml"
fi

log "✅ 恢复完成。下一步：执行 04-verify-all.sh，全绿后再切 DNS。"
