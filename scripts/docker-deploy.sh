#!/bin/bash

# 生产环境部署脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}🚀 Telos 生产环境部署脚本${NC}"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  deploy    部署所有服务到生产环境"
    echo "  update    更新指定服务"
    echo "  rollback  回滚到上一个版本"
    echo "  status    查看部署状态"
    echo "  logs      查看服务日志"
    echo "  stop      停止所有服务"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy           # 部署所有服务"
    echo "  $0 update web       # 更新 web 服务"
    echo "  $0 logs auth-service # 查看认证服务日志"
}

# 检查环境变量
check_env() {
    echo -e "${YELLOW}🔍 检查环境变量...${NC}"
    
    local required_vars=(
        "AUTH_SECRET"
        "GITHUB_CLIENT_ID"
        "GITHUB_CLIENT_SECRET"
        "DB_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 缺少必要的环境变量:${NC}"
        printf '%s\n' "${missing_vars[@]}"
        echo ""
        echo -e "${YELLOW}💡 请设置这些环境变量后重试${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 环境变量检查通过${NC}"
}

# 部署所有服务
deploy_all() {
    echo -e "${YELLOW}🚀 开始部署 Telos 到生产环境...${NC}"
    
    # 检查环境变量
    check_env
    
    # 构建镜像
    echo -e "${YELLOW}📦 构建 Docker 镜像...${NC}"
    ./scripts/docker-build.sh
    
    # 启动服务
    echo -e "${YELLOW}🔄 启动服务...${NC}"
    docker-compose up -d
    
    # 等待服务启动
    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 30
    
    # 检查服务健康状态
    check_health
    
    echo -e "${GREEN}🎉 部署完成！${NC}"
    show_status
}

# 更新指定服务
update_service() {
    local service_name=$1
    
    if [[ -z "$service_name" ]]; then
        echo -e "${RED}❌ 请指定要更新的服务名称${NC}"
        echo "可用服务: web, api-gateway, registry, auth-service, user-service, workflow-service"
        exit 1
    fi
    
    echo -e "${YELLOW}🔄 更新服务: ${service_name}${NC}"
    
    # 重新构建指定服务
    case "$service_name" in
        web)
            docker build -t "telos-web:latest" -f "apps/web/Dockerfile" .
            ;;
        api-gateway)
            docker build -t "telos-api-gateway:latest" -f "apps/api-gateway/Dockerfile" .
            ;;
        registry)
            docker build -t "telos-registry:latest" -f "apps/registry/Dockerfile" .
            ;;
        auth-service)
            docker build -t "telos-auth-service:latest" -f "services/auth-service/Dockerfile" .
            ;;
        user-service)
            docker build -t "telos-user-service:latest" -f "services/user-service/Dockerfile" .
            ;;
        workflow-service)
            docker build -t "telos-workflow-service:latest" -f "services/workflow-service/Dockerfile" .
            ;;
        *)
            echo -e "${RED}❌ 未知服务: ${service_name}${NC}"
            exit 1
            ;;
    esac
    
    # 重启服务
    docker-compose up -d "$service_name"
    
    echo -e "${GREEN}✅ 服务 ${service_name} 更新完成${NC}"
}

# 检查服务健康状态
check_health() {
    echo -e "${YELLOW}🏥 检查服务健康状态...${NC}"
    
    local services=("registry" "api-gateway" "auth-service" "user-service" "workflow-service" "web")
    local unhealthy_services=()
    
    for service in "${services[@]}"; do
        if ! docker-compose ps "$service" | grep -q "healthy\|Up"; then
            unhealthy_services+=("$service")
        fi
    done
    
    if [[ ${#unhealthy_services[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 以下服务状态异常:${NC}"
        printf '%s\n' "${unhealthy_services[@]}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 所有服务运行正常${NC}"
}

# 查看部署状态
show_status() {
    echo -e "${YELLOW}📊 服务状态:${NC}"
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}🌐 服务访问地址:${NC}"
    echo "  🌍 Web 应用: http://localhost:8800"
    echo "  🚪 API 网关: http://localhost:8080"
    echo "  📋 服务注册中心: http://localhost:8090"
    echo "  🔐 认证服务: http://localhost:8081"
    echo "  👤 用户服务: http://localhost:8082"
    echo "  ⚙️  工作流服务: http://localhost:8083"
}

# 查看服务日志
show_logs() {
    local service_name=${1:-}
    
    if [[ -n "$service_name" ]]; then
        echo -e "${YELLOW}📋 查看 ${service_name} 服务日志...${NC}"
        docker-compose logs -f "$service_name"
    else
        echo -e "${YELLOW}📋 查看所有服务日志...${NC}"
        docker-compose logs -f
    fi
}

# 停止所有服务
stop_all() {
    echo -e "${YELLOW}🛑 停止所有服务...${NC}"
    
    docker-compose down
    
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 回滚部署
rollback() {
    echo -e "${YELLOW}🔄 回滚到上一个版本...${NC}"
    echo -e "${RED}⚠️  回滚功能需要配合 CI/CD 系统实现${NC}"
    echo -e "${BLUE}💡 建议使用 Git 标签和镜像版本管理${NC}"
}

# 主逻辑
case "${1:-help}" in
    deploy)
        deploy_all
        ;;
    update)
        update_service "$2"
        ;;
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    stop)
        stop_all
        ;;
    help|*)
        show_help
        ;;
esac