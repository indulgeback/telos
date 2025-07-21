.PHONY: build run test clean docker-build docker-run help

.DEFAULT_GOAL := help

APP_NAME := auth-service
MAIN_FILE := cmd/main.go

build:
	@echo "🔨 构建应用..."
	go build -o bin/$(APP_NAME) $(MAIN_FILE)

run:
	@echo "🚀 启动应用..."
	go run $(MAIN_FILE)

test:
	@echo "🧪 运行测试..."
	go test ./...

clean:
	@echo "🧹 清理构建文件..."
	rm -rf bin/
	go clean

deps:
	@echo "📦 安装依赖..."
	go mod tidy
	go mod download

fmt:
	@echo "🎨 格式化代码..."
	go fmt ./...

lint:
	@echo "🔍 代码检查..."
	golangci-lint run

docker-build:
	@echo "🐳 构建 Docker 镜像..."
	docker build -t $(APP_NAME):latest .

docker-run:
	@echo "🐳 运行 Docker 容器..."
	docker-compose up -d

docker-stop:
	@echo "🐳 停止 Docker 容器..."
	docker-compose down

dev:
	@echo "🔥 开发模式启动..."
	air

help:
	@echo "📋 可用命令:"
	@echo "  build        - 构建应用"
	@echo "  run          - 运行应用"
	@echo "  test         - 运行测试"
	@echo "  clean        - 清理构建文件"
	@echo "  deps         - 安装依赖"
	@echo "  fmt          - 格式化代码"
	@echo "  lint         - 代码检查"
	@echo "  docker-build - 构建 Docker 镜像"
	@echo "  docker-run   - 运行 Docker 容器"
	@echo "  docker-stop  - 停止 Docker 容器"
	@echo "  dev          - 开发模式启动"
	@echo "  help         - 显示帮助信息" 