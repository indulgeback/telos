# Web 应用 Dockerfile
FROM node:20-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 pnpm 配置文件
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# 依赖安装阶段
FROM base AS deps
# 复制 package.json 文件
COPY package.json ./
COPY apps/web/package.json ./apps/web/
# 复制 prisma schema (web 的 postinstall: prisma generate 需要, web/prisma.config.ts 引用 ../../prisma/schema.prisma)
COPY prisma ./prisma

# 安装依赖 (--ignore-scripts 跳过根 package.json 的 husky prepare, 容器里不需要)
RUN pnpm install --frozen-lockfile --ignore-scripts

# 单独执行 web 的 prisma generate (postinstall 被 ignore-scripts 跳过了, 这里补上)
# web/prisma.config.ts 引用 ../../prisma/schema.prisma, 所以在 apps/web 目录执行
RUN cd apps/web && npx prisma generate

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# 复制源代码 (含 prisma schema, build 时也可能需要)
COPY apps/web ./apps/web
COPY prisma ./prisma

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 构建应用
WORKDIR /app/apps/web
RUN pnpm build

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# 设置用户
USER nextjs

# 暴露端口
EXPOSE 8800

# 设置环境变量
ENV PORT 8800
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV production

# 启动应用
CMD ["node", "server.js"]