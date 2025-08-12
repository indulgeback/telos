# 用户服务 Dockerfile
FROM golang:1.24-alpine AS builder

# 安装必要的系统依赖
RUN apk add --no-cache git ca-certificates tzdata

# 设置工作目录
WORKDIR /app

# 复制 go mod 文件
COPY services/user-service/go.mod services/user-service/go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY services/user-service/ ./

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# 运行阶段
FROM alpine:latest

# 安装 ca-certificates 用于 HTTPS 请求
RUN apk --no-cache add ca-certificates tzdata

# 创建非 root 用户
RUN adduser -D -s /bin/sh appuser

# 设置工作目录
WORKDIR /root/

# 复制构建的二进制文件
COPY --from=builder /app/main .

# 复制配置文件（如果有）
COPY --from=builder /app/.env* ./

# 设置用户
USER appuser

# 暴露端口
EXPOSE 8082

# 启动应用
CMD ["./main"]