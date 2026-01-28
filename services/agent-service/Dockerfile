# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY services/agent-service/package.json services/agent-service/pnpm-lock.yaml ./services/agent-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install dependencies
RUN cd services/agent-service && pnpm install --frozen-lockfile

# Copy source code
COPY services/agent-service ./services/agent-service

# Build TypeScript
RUN cd services/agent-service && pnpm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY services/agent-service/package.json services/agent-service/pnpm-lock.yaml ./services/agent-service/
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN cd services/agent-service && pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/services/agent-service/dist ./services/agent-service/dist

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
