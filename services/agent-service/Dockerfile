# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files (monorepo 共用根 pnpm-lock.yaml, 子项目无独立 lock)
COPY services/agent-service/package.json ./services/agent-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy prisma schema (agent-service 共用根 schema, 需要 generate @prisma/client 类型)
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Install dependencies (--ignore-scripts 跳过根 package.json 的 husky prepare, 容器里不需要)
RUN cd services/agent-service && pnpm install --frozen-lockfile --ignore-scripts

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

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY services/agent-service/package.json ./services/agent-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY prisma ./prisma
# Prisma 7 的 migrate deploy/resolve 从该配置读取 datasource URL。
COPY prisma.config.ts ./prisma.config.ts

# Install production dependencies only (--ignore-scripts 跳过 husky prepare)
RUN cd services/agent-service && pnpm install --prod --frozen-lockfile --ignore-scripts

# Runtime 也需要生成 Prisma Client (--prod 重装后 client 是空的)。Prisma
# CLI 是锁文件固定的 production dependency，不允许 npx 在构建时临时下载。
RUN cd services/agent-service && pnpm exec prisma generate --schema ../../prisma/schema.prisma

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
