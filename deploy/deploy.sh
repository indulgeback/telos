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
#   3. 停止旧 Agent worker,备份数据库并执行 Prisma migration
#   4. docker compose up -d 滚动更新
#   5. 对每个服务做健康检查轮询
#   6. 失败时输出最近 80 行日志便于排查
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
# 在加载 .env 前保存调用方传入的 tag，避免 .env 中的 IMAGE_TAG 覆盖发布参数。
REQUESTED_IMAGE_TAG="${1:-${IMAGE_TAG:-}}"
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-90}   # 单个服务健康检查最长等待秒数
HEALTH_INTERVAL=${HEALTH_INTERVAL:-5}  # 轮询间隔

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

# 加载生产环境配置。
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# CLI/调用方环境 > .env > latest。
IMAGE_TAG="${REQUESTED_IMAGE_TAG:-${IMAGE_TAG:-latest}}"
if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]; then
  err "非法镜像 tag"
  exit 1
fi
export IMAGE_TAG

# 旧生产 .env 没有该变量时，工作区分享链接与公网 API 使用同一地址。
export WORKSPACE_SHARE_BASE_URL="${WORKSPACE_SHARE_BASE_URL:-${NEXT_PUBLIC_API_URL:-}}"

declare -a REQUIRED_ENV_VARS=(
  POSTGRES_PASSWORD
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
  NEXT_PUBLIC_API_URL
  GATEWAY_INTERNAL_SECRET
  WORKSPACE_SHARE_BASE_URL
)
for required_var in "${REQUIRED_ENV_VARS[@]}"; do
  if [[ -z "${!required_var:-}" ]]; then
    err "生产配置缺少必填变量: ${required_var}"
    exit 1
  fi
done

if [[ -z "${AGENT_STATE_SIGNING_SECRET:-}" ]]; then
  warn "AGENT_STATE_SIGNING_SECRET 未单独设置,本次将回退到 GATEWAY_INTERNAL_SECRET"
fi

log "🚀 开始部署 Telos,镜像 tag: ${IMAGE_TAG}"
log "📁 部署目录: ${DEPLOY_DIR}"

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

# 只检查结构，不把渲染后的配置（可能包含密钥）写入日志。
if ! "${DC[@]}" -f "$COMPOSE_FILE" config >/dev/null; then
  err "Docker Compose 配置校验失败"
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

# ---------------------------- 数据库迁移 -------------------------------------
# 先保证数据库在线；业务服务仍保持当前版本，直到新镜像全部拉取完成。
log "🧱 确保数据库基础设施已就绪..."
"${DC[@]}" -f "$COMPOSE_FILE" up -d postgres redis consul

postgres_status="missing"
elapsed=0
while (( elapsed < HEALTH_TIMEOUT )); do
  postgres_status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' telos-postgres 2>/dev/null || echo "missing")"
  if [[ "$postgres_status" == "healthy" || "$postgres_status" == "running" ]]; then
    break
  fi
  if [[ "$postgres_status" == "unhealthy" ]]; then
    err "PostgreSQL 不健康,取消部署"
    exit 1
  fi
  sleep "$HEALTH_INTERVAL"
  elapsed=$((elapsed + HEALTH_INTERVAL))
done
if [[ "$postgres_status" != "healthy" && "$postgres_status" != "running" ]]; then
  err "PostgreSQL 在 ${HEALTH_TIMEOUT}s 内未就绪"
  exit 1
fi

# 服务名 → 容器名映射 (与 compose 中 container_name 一致)。
declare -a SERVICES=(
  "consul:telos-consul"
  "postgres:telos-postgres"
  "redis:telos-redis"
  "registry:telos-registry"
  "api-gateway:telos-api-gateway"
  "agent-service:telos-agent-service"
  "admin-service:telos-admin-service"
  "web:telos-web"
  "admin:telos-admin"
)
declare -a APPLICATION_SERVICES=(
  "registry:telos-registry"
  "api-gateway:telos-api-gateway"
  "agent-service:telos-agent-service"
  "admin-service:telos-admin-service"
  "web:telos-web"
  "admin:telos-admin"
)

# 给当前正在运行的六个应用镜像增加一个仅本机可见的回滚 tag。新版本健康
# 检查失败时，即使远端 main tag 已被覆盖，也能精确恢复上一组镜像。
ROLLBACK_TAG="rollback-$(date -u +%Y%m%d%H%M%S)"
ROLLBACK_READY="true"
for entry in "${APPLICATION_SERVICES[@]}"; do
  svc="${entry%%:*}"
  container="${entry##*:}"
  previous_image_id="$(docker inspect --format='{{.Image}}' "$container" 2>/dev/null || true)"
  if [[ -z "$previous_image_id" ]] || ! docker image tag "$previous_image_id" \
    "ghcr.io/${IMAGE_OWNER:-indulgeback}/telos-${svc}:${ROLLBACK_TAG}"; then
    ROLLBACK_READY="false"
    warn "无法为 ${svc} 保存本机回滚镜像"
  fi
done
if [[ "$ROLLBACK_READY" == "true" ]]; then
  ok "已保存上一版本本机回滚镜像: ${ROLLBACK_TAG}"
else
  for entry in "${APPLICATION_SERVICES[@]}"; do
    svc="${entry%%:*}"
    docker image rm \
      "ghcr.io/${IMAGE_OWNER:-indulgeback}/telos-${svc}:${ROLLBACK_TAG}" \
      >/dev/null 2>&1 || true
  done
  err "无法建立完整的上一版本回滚点,在停止 worker 和迁移前取消部署"
  exit 1
fi

AGENT_WAS_RUNNING="$(docker inspect --format='{{.State.Running}}' telos-agent-service 2>/dev/null || echo false)"
restore_previous_release_files() {
  local restore_dir="${PREVIOUS_RELEASE_BACKUP_DIR:-}"
  if [[ -z "$restore_dir" || ! -d "$restore_dir" ]]; then
    return 0
  fi
  if [[ "$restore_dir" != "$DEPLOY_DIR"/deploy/backups/release-* ]]; then
    err "拒绝从部署目录之外恢复发布清单"
    return 1
  fi
  if [[ -f "$restore_dir/docker-compose.prod.yml" ]]; then
    install -m 0644 "$restore_dir/docker-compose.prod.yml" "$COMPOSE_FILE"
  fi
  if [[ -f "$restore_dir/deploy.sh" ]]; then
    install -m 0755 "$restore_dir/deploy.sh" "$SCRIPT_DIR/deploy.sh"
  fi
}

restart_previous_agent() {
  restore_previous_release_files || true
  if [[ "$AGENT_WAS_RUNNING" == "true" ]]; then
    warn "恢复启动上一版本 agent-service..."
    docker start telos-agent-service >/dev/null 2>&1 || true
  fi
}

rollback_previous_release() {
  if [[ "$ROLLBACK_READY" != "true" ]]; then
    err "上一组本机镜像不完整,无法自动回滚"
    return 1
  fi
  local restore_dir="${PREVIOUS_RELEASE_BACKUP_DIR:-}"
  local rollback_compose="$restore_dir/docker-compose.prod.yml"
  if [[ "$restore_dir" != "$DEPLOY_DIR"/deploy/backups/release-* || ! -f "$rollback_compose" ]]; then
    err "缺少可信的上一版 Compose 备份,无法自动回滚"
    return 1
  fi

  warn "开始恢复上一版本镜像与 Compose (${ROLLBACK_TAG})..."
  export IMAGE_TAG="$ROLLBACK_TAG"
  if ! "${DC[@]}" -f "$rollback_compose" up -d --remove-orphans; then
    err "上一版本 Compose 启动失败"
    return 1
  fi

  local entry svc container rollback_status rollback_elapsed
  for entry in "${SERVICES[@]}"; do
    svc="${entry%%:*}"
    container="${entry##*:}"
    rollback_status="missing"
    rollback_elapsed=0
    while (( rollback_elapsed < HEALTH_TIMEOUT )); do
      rollback_status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo "missing")"
      if [[ "$rollback_status" == "healthy" || "$rollback_status" == "running" ]]; then
        break
      fi
      if [[ "$rollback_status" == "unhealthy" || "$rollback_status" == "missing" ]]; then
        err "回滚后的 ${svc} 状态异常: ${rollback_status}"
        return 1
      fi
      sleep "$HEALTH_INTERVAL"
      rollback_elapsed=$((rollback_elapsed + HEALTH_INTERVAL))
    done
    if [[ "$rollback_status" != "healthy" && "$rollback_status" != "running" ]]; then
      err "回滚后的 ${svc} 未在 ${HEALTH_TIMEOUT}s 内就绪"
      return 1
    fi
  done

  restore_previous_release_files || return 1
  ok "上一版本服务已自动恢复；数据库保留向后兼容的 additive migration"
}

RECOVERY_MODE="old_container"
recover_on_exit() {
  local exit_code="$?"
  trap - EXIT
  set +e
  if (( exit_code != 0 )); then
    case "$RECOVERY_MODE" in
      old_container)
        restart_previous_agent
        ;;
      rollback_release)
        rollback_previous_release || err "自动回滚失败,需要立即人工处理"
        ;;
    esac
  fi
  exit "$exit_code"
}
trap recover_on_exit EXIT

log "⏸️  停止旧 agent-service,阻止迁移期间产生新的 run..."
"${DC[@]}" -f "$COMPOSE_FILE" stop agent-service >/dev/null 2>&1 || true

BACKUP_DATABASE=${BACKUP_DATABASE:-true}
if [[ "$BACKUP_DATABASE" == "true" ]]; then
  backup_dir="$DEPLOY_DIR/deploy/backups/database"
  backup_file="$backup_dir/$(date -u +%Y%m%dT%H%M%SZ)-${IMAGE_TAG}.dump"
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir"
  log "💾 创建迁移前数据库备份..."
  if ! "${DC[@]}" -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-telos}" -d "${POSTGRES_DB:-telos}" -Fc \
    > "$backup_file"; then
    rm -f "$backup_file"
    err "数据库备份失败,取消迁移"
    exit 1
  fi
  if [[ ! -s "$backup_file" ]]; then
    rm -f "$backup_file"
    err "数据库备份为空,取消迁移"
    exit 1
  fi
  chmod 600 "$backup_file"
  ok "数据库备份完成: $backup_file"
fi

run_prisma() {
  "${DC[@]}" -f "$COMPOSE_FILE" run --rm --no-deps agent-service \
    sh -lc 'cd /app/services/agent-service && \
      pnpm exec prisma "$@" \
        --config /app/prisma.config.ts' \
    prisma "$@"
}

# 兼容早期用 db push 初始化、尚无 Prisma migration ledger 的生产库。
# 只有确认初始 Agent 平台表已经存在时才登记 initial migration；其余迁移仍由
# Prisma 按顺序正式执行。
migration_table_exists="$(
  "${DC[@]}" -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-telos}" -d "${POSTGRES_DB:-telos}" -At \
      -v ON_ERROR_STOP=1 \
      -c "SELECT (to_regclass('public._prisma_migrations') IS NOT NULL)::text;" \
    | tr -d '[:space:]'
)"
initial_recorded="false"
if [[ "$migration_table_exists" == "true" ]]; then
  initial_recorded="$(
    "${DC[@]}" -f "$COMPOSE_FILE" exec -T postgres \
      psql -U "${POSTGRES_USER:-telos}" -d "${POSTGRES_DB:-telos}" -At \
        -v ON_ERROR_STOP=1 \
        -c "SELECT EXISTS (
              SELECT 1 FROM _prisma_migrations
              WHERE migration_name = '20260603000000_agent_platform'
                AND finished_at IS NOT NULL
                AND rolled_back_at IS NULL
            )::text;" \
      | tr -d '[:space:]'
  )"
fi

if [[ "$initial_recorded" != "true" ]]; then
  existing_table_count="$(
    "${DC[@]}" -f "$COMPOSE_FILE" exec -T postgres \
      psql -U "${POSTGRES_USER:-telos}" -d "${POSTGRES_DB:-telos}" -At \
        -v ON_ERROR_STOP=1 \
        -c "SELECT count(*) FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename <> '_prisma_migrations';" \
      | tr -d '[:space:]'
  )"

  if (( existing_table_count > 0 )); then
    log "🔎 用冻结的 Phase 1 schema 对旧数据库做完整 Prisma diff..."
    if run_prisma migrate diff \
      --exit-code \
      --from-config-datasource \
      --to-schema /app/prisma/baselines/20260702000000_phase1/schema.prisma; then
      ok "旧数据库与冻结的 Phase 1 schema 完全一致"
      if ! run_prisma migrate resolve \
        --applied 20260603000000_agent_platform \
        --schema /app/prisma/schema.prisma; then
        err "登记 migration 基线失败"
        exit 1
      fi
    else
      diff_status="$?"
      if [[ "$diff_status" == "2" ]]; then
        err "数据库与冻结的 Phase 1 schema 存在 drift,拒绝自动登记基线"
      else
        err "Prisma baseline diff 执行失败 (exit=${diff_status})"
      fi
      exit 1
    fi
  fi
fi
log "🗄️  执行 Prisma production migrations..."
if ! run_prisma migrate deploy --schema /app/prisma/schema.prisma; then
  err "数据库迁移失败"
  exit 1
fi

migration_state="$(
  "${DC[@]}" -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-telos}" -d "${POSTGRES_DB:-telos}" -At \
      -v ON_ERROR_STOP=1 \
      -c "SELECT CASE WHEN
            EXISTS (
              SELECT 1 FROM _prisma_migrations
              WHERE migration_name = '20260826000000_agent_execution_kernel'
                AND finished_at IS NOT NULL
                AND rolled_back_at IS NULL
            )
            AND to_regclass('public.agent_run_attempts') IS NOT NULL
            AND to_regclass('public.agent_tool_calls') IS NOT NULL
            AND to_regclass('public.agent_tool_approvals') IS NOT NULL
            AND to_regclass('public.agent_outbox_events') IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM pg_enum e
              JOIN pg_type t ON t.oid = e.enumtypid
              WHERE t.typname = 'AgentRunStatus'
                AND e.enumlabel = 'awaiting_approval'
            )
          THEN 'ok' ELSE 'missing' END;" \
    | tr -d '[:space:]'
)"
if [[ "$migration_state" != "ok" ]]; then
  err "Phase 2 migration 账本或关键结构校验失败"
  exit 1
fi
ok "Prisma migrations 与 Phase 2 数据库结构校验通过"

# ---------------------------- 启动服务 ---------------------------------------
log "🔄 启动全部服务..."
RECOVERY_MODE="rollback_release"
if ! "${DC[@]}" -f "$COMPOSE_FILE" up -d --remove-orphans; then
  err "新版本 Compose 启动失败"
  exit 1
fi
ok "服务已启动,开始健康检查..."

# ---------------------------- 健康检查 ---------------------------------------
# 顺序即依赖链: Consul 先起 → registry → 其他服务
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
  err "  - 退出后脚本会尝试自动恢复上一组本机镜像"
  exit 1
fi

# 新版本已经全量健康，后续清理失败不应触发业务回滚。
RECOVERY_MODE="none"

# 健康确认后移除临时回滚别名；旧镜像随后按常规清理策略处理。
for entry in "${APPLICATION_SERVICES[@]}"; do
  svc="${entry%%:*}"
  docker image rm \
    "ghcr.io/${IMAGE_OWNER:-indulgeback}/telos-${svc}:${ROLLBACK_TAG}" \
    >/dev/null 2>&1 || true
done

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
