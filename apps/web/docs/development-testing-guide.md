# 开发环境测试配置指南

本文档说明如何设置本地开发环境的 Google OAuth 测试配置。

## 前提条件

- Node.js 18+ 和 pnpm
- Google Cloud Console 账户
- 本地开发服务器运行在 http://localhost:8800

## Google Cloud Console 配置

### 1. 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击项目选择器，创建新项目
3. 项目名称：`telos-oauth-dev`（或您喜欢的名称）
4. 记录项目 ID，稍后需要使用

### 2. 启用 Google+ API

1. 在 Google Cloud Console 中，导航到 "APIs & Services" > "Library"
2. 搜索 "Google+ API" 或 "People API"
3. 点击启用 API

### 3. 配置 OAuth 同意屏幕

1. 导航到 "APIs & Services" > "OAuth consent screen"
2. 选择 "External" 用户类型（开发测试）
3. 填写应用信息：
   - 应用名称：`Telos Development`
   - 用户支持邮箱：您的邮箱
   - 开发者联系信息：您的邮箱
4. 添加测试用户（您的 Google 账户）
5. 保存并继续

### 4. 创建 OAuth 2.0 客户端 ID

1. 导航到 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "OAuth client ID"
3. 应用类型：Web application
4. 名称：`Telos Web Client (Development)`
5. 授权的重定向 URI：
   - `http://localhost:8800/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`（备用端口）
6. 点击创建
7. 复制客户端 ID 和客户端密钥

## 本地环境配置

### 1. 环境变量设置

创建或更新 `apps/web/.env.local` 文件：

```bash
# NextAuth 配置
AUTH_SECRET="your-32-character-secret-key-here"
NEXTAUTH_URL="http://localhost:8800"

# Google OAuth 配置
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth 配置（保持现有配置）
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# 开发环境标识
NODE_ENV="development"
```

### 2. 生成安全密钥

使用以下命令生成安全的 AUTH_SECRET：

```bash
# 使用 openssl
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 验证配置

检查 `.env.local` 文件是否包含所有必需的变量：

```bash
# 在 apps/web 目录下运行
cat .env.local | grep -E "(AUTH_SECRET|NEXTAUTH_URL|GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET)"
```

## 开发服务器启动

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 启动开发服务器

```bash
# 启动 Web 前端（端口 8800）
pnpm web:dev

# 或者使用备用命令
pnpm --filter ./apps/web dev
```

### 3. 验证服务器运行

访问 http://localhost:8800，确认页面正常加载。

## 测试流程验证

### 1. 基本功能测试

1. 访问 http://localhost:8800/auth/signin
2. 确认页面显示 Google 和 GitHub 登录按钮
3. 检查按钮样式和布局是否正确

### 2. Google OAuth 流程测试

1. 点击 "Sign in with Google" 按钮
2. 应该重定向到 Google 授权页面
3. 使用测试账户登录
4. 授权应用访问基本信息
5. 应该重定向回应用并显示用户信息

### 3. 错误处理测试

1. 测试用户拒绝授权：
   - 在 Google 授权页面点击 "取消"
   - 应该重定向到错误页面并显示友好的错误信息

2. 测试无效配置：
   - 临时修改 GOOGLE_CLIENT_ID 为无效值
   - 重启服务器
   - 尝试登录应该显示配置错误

### 4. 会话管理测试

1. 成功登录后，检查用户会话：
   - 刷新页面，用户应该保持登录状态
   - 检查浏览器开发者工具中的 Cookie

2. 测试登出功能：
   - 点击登出按钮
   - 应该清除会话并重定向到登录页面

## 调试工具

### 1. 浏览器开发者工具

- **Network 标签**：查看 OAuth 请求和响应
- **Application 标签**：检查 Cookie 和本地存储
- **Console 标签**：查看 JavaScript 错误和日志

### 2. NextAuth 调试

在 `.env.local` 中添加调试配置：

```bash
# 启用 NextAuth 调试日志
NEXTAUTH_DEBUG=true
```

### 3. 服务器日志

开发服务器会在终端显示详细的请求日志，包括：

- OAuth 回调请求
- JWT 创建和验证
- 会话管理操作

## 常见问题排除

### 1. 重定向 URI 不匹配

**错误信息**：`redirect_uri_mismatch`

**解决方案**：

1. 检查 Google Cloud Console 中配置的重定向 URI
2. 确保 URI 完全匹配，包括端口号
3. 常见的正确 URI：`http://localhost:8800/api/auth/callback/google`

### 2. 客户端 ID 无效

**错误信息**：`invalid_client`

**解决方案**：

1. 检查 `.env.local` 中的 GOOGLE_CLIENT_ID
2. 确保没有多余的空格或换行符
3. 重新从 Google Cloud Console 复制客户端 ID

### 3. 会话问题

**症状**：登录后立即退出或会话不持久

**解决方案**：

1. 检查 AUTH_SECRET 是否设置且长度足够（至少 32 字符）
2. 确保 NEXTAUTH_URL 与实际访问的 URL 匹配
3. 清除浏览器 Cookie 和本地存储

### 4. HTTPS 要求

**错误信息**：某些功能需要 HTTPS

**解决方案**：

1. 开发环境通常使用 HTTP，这是正常的
2. 如需 HTTPS，可以使用 mkcert 创建本地证书
3. 或使用 ngrok 等工具创建 HTTPS 隧道

## 测试检查清单

在提交代码前，请确认以下测试都通过：

- [ ] Google OAuth 登录流程完整工作
- [ ] GitHub OAuth 登录流程仍然正常（向后兼容）
- [ ] 用户信息正确显示和存储
- [ ] 会话在页面刷新后保持
- [ ] 登出功能正常工作
- [ ] 错误页面正确显示错误信息
- [ ] 多语言支持正常工作
- [ ] 移动端响应式布局正确
- [ ] 浏览器控制台无错误信息
- [ ] 网络请求都成功完成

## 自动化测试

### 运行单元测试

```bash
# 运行所有单元测试
pnpm --filter ./apps/web test

# 运行特定测试文件
pnpm --filter ./apps/web test -- google-oauth.test.ts
```

### 运行集成测试

```bash
# 运行所有集成测试
pnpm --filter ./apps/web test:integration

# 运行特定集成测试
pnpm --filter ./apps/web test:integration -- auth-integration.test.ts
```

### 生成测试覆盖率报告

```bash
# 单元测试覆盖率
pnpm --filter ./apps/web test:coverage

# 集成测试覆盖率
pnpm --filter ./apps/web test:integration:coverage
```

## 性能测试

### 1. 页面加载性能

使用浏览器开发者工具的 Performance 标签：

1. 打开 Performance 标签
2. 点击录制按钮
3. 访问登录页面
4. 停止录制并分析结果

目标指标：

- 首次内容绘制 (FCP) < 1.5s
- 最大内容绘制 (LCP) < 2.5s
- 首次输入延迟 (FID) < 100ms

### 2. OAuth 流程性能

测试 OAuth 登录流程的响应时间：

1. 点击登录按钮到重定向的时间
2. Google 授权页面的加载时间
3. 回调处理和最终登录的时间

## 安全测试

### 1. CSRF 保护

验证 CSRF 保护是否正常工作：

1. 检查 OAuth 请求中的 state 参数
2. 确保 state 参数在回调中正确验证

### 2. 会话安全

检查会话 Cookie 的安全属性：

1. HttpOnly 标志应该设置
2. SameSite 属性应该设置为 'lax' 或 'strict'
3. 在生产环境中 Secure 标志应该设置

### 3. 权限范围

确认 OAuth 权限范围最小化：

- Google: `openid email profile`
- GitHub: `read:user user:email`

## 下一步

完成开发环境测试后，您可以：

1. 继续开发其他功能
2. 准备生产环境配置
3. 进行更全面的端到端测试
4. 优化性能和用户体验

如有问题，请参考故障排除部分或联系开发团队。

## 自动化工具

### 快速设置脚本

我们提供了自动化脚本来简化开发环境设置：

```bash
# 自动设置开发环境
pnpm setup:dev
```

此脚本将：

- 引导您配置所有必需的环境变量
- 自动生成安全的 AUTH_SECRET
- 验证配置的正确性
- 可选择安装项目依赖

### 配置验证脚本

验证开发环境配置是否正确：

```bash
# 验证开发环境配置
pnpm test:dev-config
```

此脚本将检查：

- 环境变量配置
- 项目依赖
- 关键文件存在性
- 端口可用性
- 测试配置

### 示例配置文件

提供了示例配置文件 `.env.local.example`，包含：

- 所有必需的环境变量
- 详细的配置说明
- 安全最佳实践

## 开发工作流

### 1. 初始设置

```bash
# 克隆项目后的首次设置
cd apps/web
pnpm setup:dev
```

### 2. 日常开发

```bash
# 验证配置
pnpm test:dev-config

# 启动开发服务器
pnpm web:dev

# 运行测试
pnpm test
pnpm test:integration
```

### 3. 问题排查

```bash
# 重新验证配置
pnpm test:dev-config

# 检查服务器日志
# 查看浏览器开发者工具
# 检查 Google Cloud Console 配置
```

## 配置文件说明

### .env.local 结构

```bash
# 必需配置
AUTH_SECRET="base64-encoded-32-byte-secret"
NEXTAUTH_URL="http://localhost:8800"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# 可选配置
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
NODE_ENV="development"

# 调试配置
NEXTAUTH_DEBUG=true  # 启用详细日志
```

### 安全注意事项

1. **不要提交 .env.local 到版本控制**
2. **定期轮换客户端密钥**
3. **使用强随机 AUTH_SECRET**
4. **限制 OAuth 权限范围**
5. **在生产环境使用 HTTPS**

## 测试场景覆盖

### 功能测试

- ✅ Google OAuth 登录流程
- ✅ GitHub OAuth 登录流程（向后兼容）
- ✅ 用户信息显示和存储
- ✅ 会话持久化
- ✅ 登出功能
- ✅ 错误处理和显示
- ✅ 多语言支持
- ✅ 响应式布局

### 性能测试

- ✅ 页面加载时间
- ✅ OAuth 流程响应时间
- ✅ 资源预加载效果
- ✅ 缓存机制验证

### 安全测试

- ✅ CSRF 保护验证
- ✅ 会话安全检查
- ✅ 权限范围最小化
- ✅ 输入验证和清理

### 兼容性测试

- ✅ 多浏览器支持
- ✅ 移动设备适配
- ✅ 不同屏幕尺寸
- ✅ 键盘导航支持

## 部署前检查清单

在部署到生产环境前，请确认：

- [ ] 所有测试通过（单元测试 + 集成测试）
- [ ] 配置验证脚本通过
- [ ] Google Cloud Console 生产配置完成
- [ ] 生产环境变量配置正确
- [ ] HTTPS 证书配置完成
- [ ] 安全头设置正确
- [ ] 监控和日志配置完成
- [ ] 错误处理和用户体验优化
- [ ] 性能指标达到要求
- [ ] 文档更新完成

## 总结

通过这套完整的开发环境测试配置，我们确保了：

1. **快速上手**：自动化设置脚本让新开发者能够快速开始
2. **配置验证**：自动检查确保环境配置正确
3. **全面测试**：覆盖功能、性能、安全、兼容性等各个方面
4. **问题排查**：提供详细的调试工具和故障排除指南
5. **最佳实践**：遵循安全和性能最佳实践

这为 Google OAuth 集成的开发和测试提供了坚实的基础。
