#!/usr/bin/env bash
# =============================================================================
# Telos 生产环境部署脚本
# -----------------------------------------------------------------------------
# 用法:
#   ./deploy.sh <镜像 tag>     # 部署指定 tag (如 main / 1.0.0 / sha-abc1234)
#   ./deploy.sh               # 不传 tag,使用 .env 中的 IMAGE_TAG 或 latest
#
# 在服务器上的目录结构:
#   /opt/telos/
#   ├── docker-compose.prod.yml
#   ├── deploy/
#   │   └── deploy.sh
#   └── .env
#
# 行为:
#   1. 登录 GHCR (使用 GHCR_TOKEN)
#   2. 拉取指定 tag 的镜像
#   3. docker compose up -d 滚动更新
#   4. 对每个服务做健康检查轮询
#   5. 失败时输出最近 80 行日志便于排查
# =============================================================================
set -euo pipefail

# ---------------------------- 颜色与日志 -------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
ok()   { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $*"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $*" >&2; }

# ---------------------------- 路径与配置 -------------------------------------
# 脚本所在目录的上一级即部署根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

cd "$DEPLOY_DIR"

# ---------------------------- 参数解析 ---------------------------------------
IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-90}   # 单个服务健康检查最长等待秒数
HEALTH_INTERVAL=${HEALTH_INTERVAL:-5}  # 轮询间隔

log "🚀 开始部署 Telos,镜像 tag: ${IMAGE_TAG}"
log "📁 部署目录: ${DEPLOY_DIR}"

# ---------------------------- 前置检查 ---------------------------------------
if [[ ! -f "$COMPOSE_FILE" ]]; then
  err "找不到 compose 文件: $COMPOSE_FILE"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  err "找不到 .env 文件: $ENV_FILE"
  err "请参考 deploy/.env.example 创建并填写生产密钥"
  exit 1
fi

# 加载 .env (不覆盖已导出的 IMAGE_TAG)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
# 重新覆盖为本次部署的 tag (优先级最高)
export IMAGE_TAG="$IMAGE_TAG"

# ---------------------------- Docker Compose 命令 ----------------------------
# 兼容 docker compose (v2) 与 docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  err "未安装 docker compose,请先安装: https://docs.docker.com/compose/install/"
  exit 1
fi

# ---------------------------- GHCR 登录 --------------------------------------
# 私有镜像需要登录。若未配置 token 则跳过(假定已通过 docker login 或公开镜像)
if [[ -n "${GHCR_TOKEN:-}" ]] && [[ -n "${GHCR_USER:-${IMAGE_OWNER:-indulgeback}}" ]]; then
  log "🔑 登录 GHCR..."
  echo "$GHCR_TOKEN" | docker login ghcr.io \
    -u "${GHCR_USER}" \
    --password-stdin
fi

# ---------------------------- 拉取镜像 ---------------------------------------
log "📥 拉取最新镜像 (tag: ${IMAGE_TAG})..."
if ! "${DC[@]}" -f "$COMPOSE_FILE" pull; then
  err "镜像拉取失败"
  err "请检查:"
  err "  1. GHCR_TOKEN 是否有效且有 read:packages 权限"
  err "  2. tag '${IMAGE_TAG}' 是否存在"
  exit 1
fi
ok "镜像拉取完成"

# ---------------------------- 启动服务 ---------------------------------------
log "🔄 启动服务..."
# 先启动基础设施 (postgres / redis / registry),再起依赖它们的服务
# docker compose 的 depends_on + healthcheck 已能处理依赖顺序,直接 up -d 即可
"${DC[@]}" -f "$COMPOSE_FILE" up -d --remove-orphans
ok "服务已启动,开始健康检查..."

# ---------------------------- 健康检查 ---------------------------------------
# 服务名 → 容器名映射 (与 compose 中 container_name 一致)
# 顺序即依赖链: Consul 先起 → registry → 其他服务
declare -a SERVICES=(
  "consul:telos-consul"
  "postgres:telos-postgres"
  "redis:telos-redis"
  "registry:telos-registry"
  "api-gateway:telos-api-gateway"
  "agent-service:telos-agent-service"
  "web:telos-web"
)

FAILED_SERVICE=""
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  container="${entry##*:}"
  log "🏥 检查 ${svc} (${container})..."

  elapsed=0
  while (( elapsed < HEALTH_TIMEOUT )); do
    # docker inspect health 状态: healthy / unhealthy / starting / 无 healthcheck
    status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo "missing")"

    case "$status" in
      healthy|running)
        ok "${svc} 健康 (${status})"
        break
        ;;
      unhealthy)
        err "${svc} 不健康 (unhealthy)"
        FAILED_SERVICE="$svc"
        break 2
        ;;
      missing)
        err "容器 ${container} 不存在"
        FAILED_SERVICE="$svc"
        break 2
        ;;
      *)
        # starting / created / 已退出但未触发 health 等待继续
        sleep "$HEALTH_INTERVAL"
        elapsed=$((elapsed + HEALTH_INTERVAL))
        ;;
    esac
  done

  if (( elapsed >= HEALTH_TIMEOUT )); then
    err "${svc} 在 ${HEALTH_TIMEOUT}s 内未就绪 (最后状态: ${status})"
    FAILED_SERVICE="$svc"
    break
  fi
done

# ---------------------------- 失败处理 ---------------------------------------
if [[ -n "$FAILED_SERVICE" ]]; then
  err "❌ 部署失败: ${FAILED_SERVICE} 未就绪"
  echo ""
  log "📋 最近 80 行日志 (${FAILED_SERVICE}):"
  "${DC[@]}" -f "$COMPOSE_FILE" logs --tail=80 "$FAILED_SERVICE" || true
  echo ""
  err "排查建议:"
  err "  - 完整日志: ${DC[*]} -f $COMPOSE_FILE logs -f $FAILED_SERVICE"
  err "  - 容器状态: ${DC[*]} -f $COMPOSE_FILE ps"
  err "  - 回滚方法: ./deploy/deploy.sh <上一个稳定的 tag>"
  exit 1
fi

# ---------------------------- 镜像清理 -------------------------------------
# 部署成功后清理无用镜像, 避免多次部署累积撑满磁盘
# 只在成功时清理, 失败时保留所有镜像便于回滚排查
# 注意: 只清 telos 相关的旧镜像 + 悬空镜像, 不影响服务器上其他服务
CLEAN_IMAGES=${CLEAN_IMAGES:-true}
if [[ "$CLEAN_IMAGES" == "true" ]]; then
  log "🧹 清理无用镜像..."

  # 1. 删除悬空镜像 (dangling <none>:<none>, 最安全, 无副作用)
  PRUNE_COUNT=$(docker images -f "dangling=true" -q | wc -l | tr -d ' ')
  docker image prune -f >/dev/null 2>&1 || true

  # 2. 删除未被容器使用的旧 telos 镜像 (ghcr.io/indulgeback/telos-*, 保留当前 tag)
  # 只针对 telos 镜像, 绝不碰 safeline/agent-lab 等其他服务
  # 注意: grep 无匹配返回 1, 在 set -o pipefail 下会导致脚本退出, 加 || true 兜底
  OLD_TELOS_IMAGES=$(docker images --filter "reference=ghcr.io/${IMAGE_OWNER:-indulgeback}/telos-*" \
    --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep -v ":${IMAGE_TAG} " | grep -v "<none>" | awk '{print $2}' | sort -u || true)
  OLD_COUNT=0
  if [[ -n "$OLD_TELOS_IMAGES" ]]; then
    # 只删当前没有任何容器在用的镜像
    RUNNING_IMAGES=$(docker ps -a --format "{{.Image}}" | sort -u)
    for img_id in $OLD_TELOS_IMAGES; do
      # 检查这个 image ID 是否被任何容器使用
      IS_USED=$(docker ps -a --filter "ancestor=$img_id" -q | head -1)
      if [[ -z "$IS_USED" ]]; then
        docker rmi "$img_id" >/dev/null 2>&1 && OLD_COUNT=$((OLD_COUNT + 1))
      fi
    done
  fi

  ok "镜像清理完成 (悬空: ${PRUNE_COUNT} 个, 旧 telos 镜像: ${OLD_COUNT} 个)"
  log "💡 磁盘: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " 已用)"}')"
fi

# ---------------------------- 成功输出 ---------------------------------------
ok "🎉 部署成功!所有服务健康。"
echo ""
log "📊 当前运行服务:"
"${DC[@]}" -f "$COMPOSE_FILE" ps
echo ""
log "📌 当前镜像 tag: ${IMAGE_TAG}"
log "💡 回滚命令: ./deploy/deploy.sh <旧 tag>"
