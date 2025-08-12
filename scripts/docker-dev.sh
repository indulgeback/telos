#!/bin/bash

# 开发环境 Docker 脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}🐳 Telos 开发环境 Docker 管理脚本${NC}"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  up      启动开发环境服务 (数据库、Redis、管理工具)"
    echo "  down    停止开发环境服务"
    echo "  logs    查看服务日志"
    echo "  clean   清理开发环境数据"
    echo "  status  查看服务状态"
    echo "  help    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 up     # 启动开发环境"
    echo "  $0 logs   # 查看日志"
    echo "  $0 down   # 停止服务"
}

# 启动开发环境
start_dev() {
    echo -e "${YELLOW}🚀 启动 Telos 开发环境...${NC}"
    
    docker-compose -f docker-compose.dev.yml up -d
    
    echo -e "${GREEN}✅ 开发环境启动成功！${NC}"
    echo ""
    echo -e "${BLUE}📋 服务访问地址:${NC}"
    echo "  🗄️  PostgreSQL: localhost:5432"
    echo "  🔴 Redis: localhost:6379"
    echo "  🐘 PgAdmin: http://localhost:5050 (admin@telos.dev / admin123)"
    echo "  📊 Redis Commander: http://localhost:8081"
    echo ""
    echo -e "${YELLOW}💡 提示: 使用 '$0 logs' 查看服务日志${NC}"
}

# 停止开发环境
stop_dev() {
    echo -e "${YELLOW}🛑 停止 Telos 开发环境...${NC}"
    
    docker-compose -f docker-compose.dev.yml down
    
    echo -e "${GREEN}✅ 开发环境已停止${NC}"
}

# 查看日志
show_logs() {
    echo -e "${YELLOW}📋 查看开发环境日志...${NC}"
    
    docker-compose -f docker-compose.dev.yml logs -f
}

# 清理开发环境
clean_dev() {
    echo -e "${RED}🧹 清理开发环境数据...${NC}"
    echo -e "${YELLOW}⚠️  这将删除所有开发环境数据，是否继续？ (y/N)${NC}"
    
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        docker-compose -f docker-compose.dev.yml down -v
        docker volume prune -f
        echo -e "${GREEN}✅ 开发环境数据已清理${NC}"
    else
        echo -e "${BLUE}ℹ️  操作已取消${NC}"
    fi
}

# 查看服务状态
show_status() {
    echo -e "${YELLOW}📊 开发环境服务状态:${NC}"
    
    docker-compose -f docker-compose.dev.yml ps
}

# 主逻辑
case "${1:-help}" in
    up)
        start_dev
        ;;
    down)
        stop_dev
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_dev
        ;;
    status)
        show_status
        ;;
    help|*)
        show_help
        ;;
esac