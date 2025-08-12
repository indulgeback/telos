#!/bin/bash

# Docker 构建脚本
set -e

echo "🐳 开始构建 Telos 项目的 Docker 镜像..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 构建函数
build_service() {
    local service_name=$1
    local dockerfile_path=$2
    local context_path=${3:-.}
    
    echo -e "${YELLOW}📦 构建 ${service_name}...${NC}"
    
    if docker build -t "telos-${service_name}:latest" -f "${dockerfile_path}" "${context_path}"; then
        echo -e "${GREEN}✅ ${service_name} 构建成功${NC}"
    else
        echo -e "${RED}❌ ${service_name} 构建失败${NC}"
        exit 1
    fi
}

# 构建所有服务
echo "🏗️  构建应用服务..."
build_service "web" "apps/web/Dockerfile"
build_service "mobile" "apps/mobile/Dockerfile"
build_service "api-gateway" "apps/api-gateway/Dockerfile"
build_service "registry" "apps/registry/Dockerfile"

echo "🔧 构建微服务..."
build_service "auth-service" "services/auth-service/Dockerfile"
build_service "user-service" "services/user-service/Dockerfile"
build_service "workflow-service" "services/workflow-service/Dockerfile"

echo -e "${GREEN}🎉 所有镜像构建完成！${NC}"

# 显示构建的镜像
echo "📋 构建的镜像列表："
docker images | grep "telos-"

echo -e "${GREEN}✨ 构建脚本执行完成！${NC}"