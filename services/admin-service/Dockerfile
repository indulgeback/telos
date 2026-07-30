# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files (monorepo 共用根 pnpm-lock.yaml)
COPY services/admin-service/package.json ./services/admin-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy prisma schema (admin-service 复用根 schema)
COPY prisma ./prisma

# Install dependencies (--ignore-scripts 跳过 husky prepare)
RUN cd services/admin-service && pnpm install --frozen-lockfile --ignore-scripts

# 生成 Prisma Client
RUN cd services/admin-service && npx prisma generate --schema ../../prisma/schema.prisma

# Copy source code
COPY services/admin-service ./services/admin-service

# Build TypeScript
RUN cd services/admin-service && pnpm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy package files
COPY services/admin-service/package.json ./services/admin-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install production dependencies only
RUN cd services/admin-service && pnpm install --prod --frozen-lockfile --ignore-scripts

# Runtime 也需要生成 Prisma Client
RUN cd services/admin-service && npx prisma generate --schema ../../prisma/schema.prisma

# Copy built files from builder
COPY --from=builder /app/services/admin-service/dist ./services/admin-service/dist

# wget for health check (alpine 自带)
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

ENV NODE_ENV=production
ENV ADMIN_PORT=3002

CMD ["node", "services/admin-service/dist/index.js"]
