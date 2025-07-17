.PHONY: build run test clean docker-build docker-run help

# 默认目标
.DEFAULT_GOAL := help

# 应用名称
APP_NAME := registry
MAIN_FILE := cmd/main.go

# 构建应用
build:
	@echo "🔨 构建应用..."
	go build -o bin/$(APP_NAME) $(MAIN_FILE)

# 运行应用
run:
	@echo "🚀 启动应用..."
	go run $(MAIN_FILE)

# 运行测试
test:
	@echo "🧪 运行测试..."
	go test ./...

# 清理构建文件
clean:
	@echo "🧹 清理构建文件..."
	rm -rf bin/
	go clean

# 安装依赖
deps:
	@echo "📦 安装依赖..."
	go mod tidy
	go mod download

# 格式化代码
fmt:
	@echo "🎨 格式化代码..."
	go fmt ./...

# 代码检查
lint:
	@echo "🔍 代码检查..."
	golangci-lint run

# Docker 构建
docker-build:
	@echo "🐳 构建 Docker 镜像..."
	docker build -t $(APP_NAME):latest .

# Docker 运行
docker-run:
	@echo "🐳 运行 Docker 容器..."
	docker-compose up -d

# Docker 停止
docker-stop:
	@echo "🐳 停止 Docker 容器..."
	docker-compose down

# 运行测试脚本
test-api:
	@echo "🧪 运行 API 测试..."
	./test/test.sh

# 开发模式（热重载）
dev:
	@echo "🔥 开发模式启动..."
	air

# 帮助信息
help:
	@echo "📋 可用命令:"
	@echo "  build      - 构建应用"
	@echo "  run        - 运行应用"
	@echo "  test       - 运行测试"
	@echo "  clean      - 清理构建文件"
	@echo "  deps       - 安装依赖"
	@echo "  fmt        - 格式化代码"
	@echo "  lint       - 代码检查"
	@echo "  docker-build - 构建 Docker 镜像"
	@echo "  docker-run   - 运行 Docker 容器"
	@echo "  docker-stop  - 停止 Docker 容器"
	@echo "  test-api   - 运行 API 测试"
	@echo "  dev        - 开发模式启动"
	@echo "  help       - 显示帮助信息" 