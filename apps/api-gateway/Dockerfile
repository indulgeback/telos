# API 网关 Dockerfile
FROM golang:1.24-alpine AS builder

# 安装必要的系统依赖
RUN apk add --no-cache git ca-certificates tzdata

# 工作目录设为 apps/api-gateway, 保留 monorepo 相对路径 (go.mod replace 指向 ../../pkg/tlog)
WORKDIR /app/apps/api-gateway

# 先复制 go mod 文件 + 本地依赖 pkg/tlog (利用 docker 层缓存)
COPY apps/api-gateway/go.mod apps/api-gateway/go.sum ./
COPY pkg/tlog /app/pkg/tlog

# 下载依赖
RUN go mod download

# 复制源代码
COPY apps/api-gateway/ ./

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /app/main ./cmd/main.go

# 运行阶段
FROM alpine:latest

# 安装 ca-certificates 用于 HTTPS 请求
RUN apk --no-cache add ca-certificates tzdata

# 创建非 root 用户
RUN adduser -D -s /bin/sh appuser

WORKDIR /root/

# 复制构建的二进制文件
COPY --from=builder /app/main .

# 设置用户
USER appuser

# 暴露端口 (代码通过 GATEWAY_PORT 环境变量控制, 默认 8890)
EXPOSE 8890

# 启动应用
CMD ["./main"]
