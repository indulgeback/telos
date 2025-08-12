# GitHub Actions 配置总结

## 📋 工作流概览

我们为 Telos 项目创建了完整的 GitHub Actions CI/CD 配置，包含以下工作流：

### 🔄 主要工作流

| 工作流          | 文件                 | 触发方式      | 功能描述                       |
| --------------- | -------------------- | ------------- | ------------------------------ |
| 🐳 构建和推送   | `build-and-push.yml` | 手动触发      | 构建 Docker 镜像并推送到 GHCR  |
| 🚀 部署         | `deploy.yml`         | 手动触发      | 部署到 staging/production 环境 |
| 🔄 CI/CD 流水线 | `ci-cd.yml`          | 代码推送/PR   | 自动化构建、测试、部署         |
| 🧪 测试套件     | `test.yml`           | 代码推送/PR   | 运行各种测试                   |
| 🚀 发布版本     | `release.yml`        | 标签推送/手动 | 创建发布版本                   |

### 🎯 工作流特性

#### 1. 构建和推送工作流 (`build-and-push.yml`)

**特性**:

- ✅ 支持选择性构建单个或所有服务
- ✅ 自定义镜像标签
- ✅ 多架构构建 (amd64, arm64)
- ✅ 构建缓存优化
- ✅ 详细的构建报告

**使用场景**:

- 开发过程中测试镜像构建
- 为特定功能构建镜像
- 构建特定版本的镜像

#### 2. 部署工作流 (`deploy.yml`)

**特性**:

- ✅ 支持 staging 和 production 环境
- ✅ 选择性部署服务
- ✅ 自动健康检查
- ✅ 部署失败回滚
- ✅ 环境变量管理

**使用场景**:

- 手动部署到测试环境
- 生产环境发布
- 紧急修复部署

#### 3. 自动化 CI/CD (`ci-cd.yml`)

**特性**:

- ✅ 智能变更检测
- ✅ 代码质量检查
- ✅ 自动构建变更的服务
- ✅ 分支策略部署
- ✅ 并行执行优化

**触发规则**:

- `develop` 分支 → 自动部署到 staging
- `main` 分支 → 自动部署到 production
- Pull Request → 运行测试和检查

#### 4. 测试套件 (`test.yml`)

**特性**:

- ✅ 前端和后端分离测试
- ✅ 集成测试
- ✅ 安全扫描
- ✅ 代码覆盖率报告
- ✅ E2E 测试支持

**测试类型**:

- 单元测试
- 集成测试
- 安全扫描 (Trivy, CodeQL)
- E2E 测试 (可选)

#### 5. 发布工作流 (`release.yml`)

**特性**:

- ✅ 自动生成变更日志
- ✅ 语义化版本管理
- ✅ 发布镜像构建
- ✅ 自动部署到生产
- ✅ 通知集成

**发布流程**:

1. 创建 Git 标签
2. 生成变更日志
3. 构建发布镜像
4. 创建 GitHub Release
5. 部署到生产环境
6. 发送通知

## 🔧 配置要求

### GitHub Secrets

在仓库设置中配置以下 Secrets：

```bash
# 必需的 Secrets
AUTH_SECRET=your-auth-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
DB_PASSWORD=your-database-password

# 可选的 Secrets (用于通知)
SLACK_WEBHOOK_URL=your-slack-webhook
DISCORD_WEBHOOK_URL=your-discord-webhook
```

### GitHub Variables

配置以下 Variables：

```bash
# Staging 环境
STAGING_DOMAIN=staging.yourdomain.com
STAGING_API_URL=https://api-staging.yourdomain.com

# Production 环境
PRODUCTION_DOMAIN=yourdomain.com
PRODUCTION_API_URL=https://api.yourdomain.com
```

### GitHub Environments

创建以下环境并配置保护规则：

1. **staging**

   - 无保护规则（自动部署）

2. **production**
   - 需要审核者批准
   - 限制部署分支为 `main`
   - 可选：等待时间

## 🚀 使用指南

### 1. 手动构建镜像

1. 进入 Actions 页面
2. 选择 "🐳 构建和推送 Docker 镜像"
3. 点击 "Run workflow"
4. 选择服务和配置参数
5. 点击 "Run workflow" 开始构建

### 2. 手动部署

1. 进入 Actions 页面
2. 选择 "🚀 部署到服务器"
3. 点击 "Run workflow"
4. 选择环境和服务
5. 配置部署参数
6. 点击 "Run workflow" 开始部署

### 3. 自动化流程

**开发流程**:

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发和提交
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 3. 创建 PR 到 develop
# → 自动触发测试

# 4. 合并到 develop
# → 自动构建并部署到 staging

# 5. 测试通过后合并到 main
# → 自动构建并部署到 production
```

**发布流程**:

```bash
# 1. 创建发布标签
git tag v1.0.0
git push origin v1.0.0

# → 自动触发发布流程
# → 构建发布镜像
# → 创建 GitHub Release
# → 部署到生产环境
```

### 4. 监控和调试

**查看工作流状态**:

- 进入 Actions 页面查看运行状态
- 点击具体工作流查看详细日志
- 查看 Summary 了解执行结果

**调试失败的工作流**:

1. 查看失败的步骤日志
2. 检查环境变量配置
3. 验证 Secrets 和 Variables
4. 检查服务健康状态

## 📊 性能优化

### 1. 构建优化

- ✅ 使用 Docker 构建缓存
- ✅ 多阶段构建减少镜像大小
- ✅ 并行构建多个服务
- ✅ 智能变更检测避免不必要的构建

### 2. 测试优化

- ✅ 矩阵策略并行测试
- ✅ 测试结果缓存
- ✅ 条件执行减少资源消耗
- ✅ 快速失败策略

### 3. 部署优化

- ✅ 健康检查确保服务可用
- ✅ 滚动更新减少停机时间
- ✅ 环境隔离避免冲突
- ✅ 自动回滚机制

## 🔒 安全最佳实践

### 1. Secrets 管理

- ✅ 使用 GitHub Secrets 存储敏感信息
- ✅ 最小权限原则
- ✅ 定期轮换密钥
- ✅ 环境隔离

### 2. 镜像安全

- ✅ 使用官方基础镜像
- ✅ 定期更新依赖
- ✅ 漏洞扫描 (Trivy)
- ✅ 非 root 用户运行

### 3. 访问控制

- ✅ 分支保护规则
- ✅ 环境保护规则
- ✅ 审核要求
- ✅ IP 限制 (可选)

## 📈 监控和通知

### 1. 状态监控

- ✅ 工作流状态徽章
- ✅ 构建结果汇总
- ✅ 健康检查报告
- ✅ 性能指标收集

### 2. 通知集成

- ✅ Slack 通知
- ✅ Discord 通知
- ✅ Email 通知 (可选)
- ✅ GitHub 通知

### 3. 日志管理

- ✅ 详细的构建日志
- ✅ 部署状态记录
- ✅ 错误信息收集
- ✅ 性能数据分析

## 🔄 持续改进

### 1. 定期维护

- 更新 GitHub Actions 版本
- 优化工作流性能
- 添加新的测试类型
- 改进错误处理

### 2. 功能扩展

- 添加更多部署目标
- 集成更多测试工具
- 增强监控能力
- 改进通知机制

### 3. 最佳实践

- 遵循 GitHub Actions 最佳实践
- 定期审查和优化配置
- 收集用户反馈
- 持续学习和改进

## 📚 相关资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Semantic Versioning](https://semver.org/)

---

**配置完成日期**: 2025.7.29  
**版本**: v1.0.0  
**维护者**: Telos 开发团队
