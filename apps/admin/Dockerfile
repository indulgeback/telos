# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy monorepo workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY apps/admin ./apps/admin

# Build (vue-tsc + vite)
RUN cd apps/admin && pnpm run build

# Runtime stage - nginx 托管静态文件
FROM nginxinc/nginx-unprivileged:1.27-alpine

# 拷贝构建产物
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# nginx 配置: SPA fallback + /api 反代到 admin-service
COPY apps/admin/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
