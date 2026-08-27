# Web 应用 Dockerfile
FROM node:20-alpine AS base

# 与根 package.json 的 packageManager 保持一致，避免 latest 主版本漂移。
RUN npm install -g pnpm@10.31.0

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

# 单独执行 prisma generate (postinstall 被 ignore-scripts 跳过了, 这里补上)
# web/prisma.config.ts 引用 ../../prisma/schema.prisma, 显式指定 schema 路径
RUN cd apps/web && npx prisma generate --schema ../../prisma/schema.prisma

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

# ===== 关键: NEXT_PUBLIC_* 变量在构建时内联进 bundle, 必须在 build 前注入 =====
# 通过 ARG 接收, 转成 ENV 供 pnpm build 读取
# 这些都是 public 变量 (会暴露到浏览器), 不含敏感信息, 写进镜像安全
ARG NEXT_PUBLIC_API_URL=http://localhost:8890
ARG NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8800
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

# 构建应用
WORKDIR /app/apps/web
RUN pnpm build

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制 standalone 构建产物 (monorepo 下保留 apps/web 结构, server.js 在 apps/web/server.js)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# 复制静态资源到对应位置 (与 server.js 同级的 .next/static)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# 复制 public 目录 (Next.js 会从 server.js 同级找 public)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# instrumentation.ts 动态 import('undici')（服务端 HTTP 代理初始化用），
# file tracing 不收录动态依赖；undici 由 pnpm hoist 到根 node_modules（实体目录），
# 直接拷到 standalone 根 node_modules，运行时经模块向上查找命中
# （不能在 runner npm install——会连带装整个 package.json 依赖树触发 native 编译）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/undici ./node_modules/undici

# 设置用户
USER nextjs

# 工作目录指向 server.js 所在位置 (monorepo standalone 结构)
WORKDIR /app/apps/web

# 暴露端口
EXPOSE 8800

# 设置环境变量
ENV PORT 8800
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV production

# 启动应用
CMD ["node", "server.js"]
