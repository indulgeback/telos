# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY services/agent-service/go.mod services/agent-service/go.sum* ./services/agent-service/
COPY go.work go.work.sum ./

# Download dependencies
RUN cd services/agent-service && go mod download

# Copy source code
COPY services/agent-service ./services/agent-service

# Build the application
RUN cd services/agent-service && go build -o agent-service ./cmd

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Copy the binary from builder
COPY --from=builder /app/services/agent-service/agent-service .

# Expose port
EXPOSE 8895

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8895/health || exit 1

# Run the application
CMD ["./agent-service"]
