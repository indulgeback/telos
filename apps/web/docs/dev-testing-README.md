# 开发环境测试快速指南

本指南帮助您快速设置和测试 Google OAuth 开发环境。

## 快速开始

### 1. 自动设置（推荐）

运行自动设置脚本：

```bash
# 在 apps/web 目录下
pnpm setup:dev
```

此脚本将：

- 引导您配置所有必需的环境变量
- 生成安全的 AUTH_SECRET
- 验证配置的正确性
- 可选择安装依赖

### 2. 手动设置

如果您喜欢手动配置：

1. 复制示例配置文件：

   ```bash
   cp .env.local.example .env.local
   ```

2. 编辑 `.env.local` 文件，填入真实的配置值

3. 验证配置：
   ```bash
   pnpm test:dev-config
   ```

## Google Cloud Console 配置

### 创建 OAuth 2.0 客户端

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API 或 People API
4. 创建 OAuth 2.0 客户端 ID
5. 设置重定向 URI：`http://localhost:8800/api/auth/callback/google`

### 获取客户端凭据

从 Google Cloud Console 复制：

- 客户端 ID（以 `.apps.googleusercontent.com` 结尾）
- 客户端密钥

## 测试流程

### 1. 启动开发服务器

```bash
pnpm web:dev
```

服务器将在 http://localhost:8800 启动

### 2. 访问登录页面

打开浏览器访问：http://localhost:8800/auth/signin

### 3. 测试 Google 登录

1. 点击 "Sign in with Google" 按钮
2. 应该重定向到 Google 授权页面
3. 使用测试账户登录并授权
4. 应该重定向回应用并显示用户信息

### 4. 测试其他功能

- 页面刷新后会话保持
- 登出功能
- 错误处理（拒绝授权等）
- 多语言支持

## 验证工具

### 配置验证

```bash
# 检查环境配置
pnpm test:dev-config
```

### 运行测试

```bash
# 单元测试
pnpm test

# 集成测试
pnpm test:integration

# 所有测试
pnpm test && pnpm test:integration
```

## 常见问题

### 重定向 URI 不匹配

**错误**: `redirect_uri_mismatch`

**解决**: 确保 Google Cloud Console 中的重定向 URI 与实际 URL 完全匹配：

- 开发环境：`http://localhost:8800/api/auth/callback/google`

### 客户端 ID 无效

**错误**: `invalid_client`

**解决**:

1. 检查 `.env.local` 中的 `GOOGLE_CLIENT_ID`
2. 确保没有多余的空格或引号
3. 重新从 Google Cloud Console 复制

### 会话问题

**症状**: 登录后立即退出

**解决**:

1. 检查 `AUTH_SECRET` 长度（至少 32 字符）
2. 确保 `NEXTAUTH_URL` 正确
3. 清除浏览器 Cookie

### 端口冲突

**错误**: 端口 8800 被占用

**解决**:

1. 停止占用端口的进程：`lsof -ti:8800 | xargs kill`
2. 或使用其他端口并更新配置

## 调试技巧

### 启用调试日志

在 `.env.local` 中添加：

```bash
NEXTAUTH_DEBUG=true
```

### 浏览器开发者工具

- **Network 标签**: 查看 OAuth 请求
- **Application 标签**: 检查 Cookie 和存储
- **Console 标签**: 查看错误日志

### 服务器日志

开发服务器会显示详细的请求日志，包括：

- OAuth 回调
- JWT 操作
- 会话管理

## 性能测试

### 页面加载性能

使用浏览器 Performance 标签测试：

- 首次内容绘制 (FCP) < 1.5s
- 最大内容绘制 (LCP) < 2.5s

### OAuth 流程性能

测试登录流程的响应时间：

- 点击登录到重定向 < 500ms
- 回调处理时间 < 1s

## 安全检查

### CSRF 保护

验证 OAuth 请求包含 `state` 参数

### 会话安全

检查 Cookie 属性：

- `HttpOnly`: 已设置
- `SameSite`: lax 或 strict
- `Secure`: 生产环境已设置

### 权限范围

确认最小化权限：

- Google: `openid email profile`
- GitHub: `read:user user:email`

## 下一步

配置完成后，您可以：

1. 开发新功能
2. 运行完整测试套件
3. 准备生产环境配置
4. 进行端到端测试

## 获取帮助

如果遇到问题：

1. 查看 [完整开发指南](./development-testing-guide.md)
2. 运行配置验证：`pnpm test:dev-config`
3. 检查服务器日志和浏览器控制台
4. 联系开发团队

---

**提示**: 保持 `.env.local` 文件的安全，不要提交到版本控制系统。
