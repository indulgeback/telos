# GitHub OAuth 设置指南

本指南将帮助您设置 GitHub OAuth 应用，以便在 Telos Web 应用中实现 GitHub 登录功能。

## 步骤 1: 创建 GitHub OAuth 应用

1. 登录到您的 GitHub 账户
2. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
3. 点击 "OAuth Apps" 标签
4. 点击 "New OAuth App" 按钮

## 步骤 2: 配置 OAuth 应用

填写以下信息：

- **Application name**: `Telos Workflow Platform` (或您喜欢的名称)
- **Homepage URL**: `http://localhost:8800` (开发环境) 或您的生产域名
- **Application description**: `Telos 智能工作流编排平台`
- **Authorization callback URL**: `http://localhost:8800/api/auth/callback/github`

> **重要**: 回调 URL 必须精确匹配，包括协议 (http/https) 和端口号

## 步骤 3: 获取客户端凭据

创建应用后，您将看到：

- **Client ID**: 公开的标识符
- **Client Secret**: 私密密钥（点击 "Generate a new client secret" 生成）

## 步骤 4: 配置环境变量

1. 复制 `.env.example` 文件为 `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. 更新 `.env.local` 文件中的 GitHub 配置:

   ```env
   GITHUB_CLIENT_ID="your_actual_client_id_here"
   GITHUB_CLIENT_SECRET="your_actual_client_secret_here"
   ```

3. 如果还没有 AUTH_SECRET，生成一个:
   ```bash
   npx auth secret
   ```

## 步骤 5: 生产环境配置

对于生产环境，您需要：

1. 创建一个新的 GitHub OAuth 应用（或更新现有应用）
2. 设置正确的生产域名:
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/api/auth/callback/github`

3. 在生产环境中设置环境变量:
   ```env
   NEXTAUTH_URL="https://yourdomain.com"
   GITHUB_CLIENT_ID="production_client_id"
   GITHUB_CLIENT_SECRET="production_client_secret"
   AUTH_SECRET="production_auth_secret"
   ```

## 安全注意事项

1. **永远不要提交 `.env.local` 文件到版本控制**
2. **Client Secret 必须保密** - 不要在客户端代码中暴露
3. **定期轮换 Client Secret** - 特别是在怀疑泄露时
4. **使用不同的 OAuth 应用** - 开发和生产环境应该分开

## 故障排除

### 常见错误

1. **"redirect_uri_mismatch"**
   - 检查回调 URL 是否完全匹配
   - 确保包含正确的协议和端口

2. **"Client ID not found"**
   - 验证 GITHUB_CLIENT_ID 是否正确
   - 确保 OAuth 应用已正确创建

3. **"Bad verification code"**
   - 检查 GITHUB_CLIENT_SECRET 是否正确
   - 确保没有额外的空格或字符

### 调试技巧

1. 启用 NextAuth 调试模式（已在开发环境中启用）
2. 检查浏览器开发者工具的网络标签
3. 查看服务器控制台日志

## 测试登录流程

1. 启动开发服务器:

   ```bash
   pnpm dev
   ```

2. 访问 `http://localhost:8800/auth/signin`
3. 点击 "使用 GitHub 登录" 按钮
4. 完成 GitHub 授权流程
5. 应该重定向回应用并显示登录状态

## 权限范围

默认情况下，我们的 GitHub OAuth 配置请求以下权限：

- `user:email` - 读取用户邮箱地址
- `read:user` - 读取用户基本信息

如需修改权限范围，请在 `src/auth.ts` 中的 GitHub 提供者配置中添加 `scope` 参数。
