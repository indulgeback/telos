# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Keep the image toolchain aligned with the root packageManager pin.
RUN npm install -g pnpm@10.31.0

# Copy package files (monorepo 共用根 pnpm-lock.yaml, 子项目无独立 lock)
COPY services/agent-service/package.json ./services/agent-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy prisma schema (agent-service 共用根 schema, 需要 generate @prisma/client 类型)
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Install dependencies (--ignore-scripts 跳过根 package.json 的 husky prepare, 容器里不需要)
# --filter 限定只装 agent-service 自身: monorepo 锁文件包含全部包,
# 不加 filter 会把 web/mobile/admin 的依赖也 hoist 进来
RUN cd services/agent-service && pnpm install --frozen-lockfile --ignore-scripts --filter @telos/agent-service && pnpm store prune

# 生成 Prisma Client (agent-service import { Prisma, PrismaClient, Tool } from '@prisma/client')
# 不 generate 的话 tsc 会报 "has no exported member"
RUN cd services/agent-service && pnpm exec prisma generate --schema ../../prisma/schema.prisma

# Copy source code
COPY services/agent-service ./services/agent-service

# Build TypeScript
RUN cd services/agent-service && pnpm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Keep the image toolchain aligned with the root packageManager pin.
RUN npm install -g pnpm@10.31.0

# Copy package files
COPY services/agent-service/package.json ./services/agent-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY prisma ./prisma
# Prisma 7 的 migrate deploy/resolve 从该配置读取 datasource URL。
COPY prisma.config.ts ./prisma.config.ts

# Install production dependencies only, deployed to a self-contained tree.
# workspace + hoisted 模式会把 monorepo 锁文件里所有包（web/mobile/admin）的
# 依赖都提升进根 node_modules，镜像因此膨胀到 2.9GB；`pnpm deploy --prod`
 # 只物化 agent-service 自己的生产依赖，node_modules 换成精简版后 store 一并清除。
RUN cd services/agent-service \
    && pnpm deploy --legacy --ignore-scripts --filter @telos/agent-service --prod /deployed \
    && rm -rf /root/.local/share/pnpm/store \
    && rm -rf services/agent-service/node_modules \
    && cp -a /deployed/node_modules/. ./node_modules/ \
    && rm -rf /deployed

# Prisma Client 生成物从 builder 拷入（deploy --prod 不含 prisma CLI）。
# Prisma 7 把生成物写进 hoisted 的 @prisma/client 包目录（workspace 根）
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built files from builder
COPY --from=builder /app/services/agent-service/dist ./services/agent-service/dist
# Copy seed-skills markdown files (runtime 需要: ensureSystemSkills 读取这些 md 做 seed)
COPY services/agent-service/scripts/seed-skills ./services/agent-service/scripts/seed-skills

# Expose port
EXPOSE 8895

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8895/health || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=8895

# Run the application
CMD ["node", "services/agent-service/dist/index.js"]
