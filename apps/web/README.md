# Telos Web Application

Telos Web 是基于 Next.js 15 构建的现代化前端应用，为 Telos 智能工作流编排平台提供用户界面。

## 技术栈

- **Next.js 15** - React 框架，支持 App Router 和 SSR
- **React 19** - 最新的 React 并发特性
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS 4** - 实用优先的 CSS 框架
- **NextAuth.js v5** - 身份认证解决方案
- **Next-intl** - 国际化支持（18 种语言）
- **Shadcn UI** - 基于 Radix UI 的组件库

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境配置

复制环境变量模板：

```bash
cp .env.example .env.local
```

### 3. 设置 GitHub OAuth（必需）

为了使用 GitHub 登录功能，您需要设置 GitHub OAuth 应用：

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建新的 OAuth App
3. 设置回调 URL: `http://localhost:8800/api/auth/callback/github`
4. 获取 Client ID 和 Client Secret
5. 更新 `.env.local` 文件中的 GitHub 配置

详细步骤请参考：[GitHub OAuth 设置指南](./docs/GITHUB_OAUTH_SETUP.md)

### 4. 启动开发服务器

```bash
pnpm dev
```

应用将在 `http://localhost:8800` 启动。

## 功能特性

### ✅ 已实现的功能

- **身份认证系统**
  - GitHub OAuth 登录
  - 基于 Cookie 的会话管理
  - 服务端 JWT 验证
  - 受保护的路由
  - 用户状态显示

- **用户界面**
  - 响应式设计
  - 深色/浅色主题切换
  - 国际化支持
  - 现代化 UI 组件

- **页面结构**
  - 首页（公开）
  - 登录/登出页面
  - 用户仪表板（受保护）
  - 个人资料页面（受保护）
  - 设置页面（受保护）
  - 工作流管理页面（受保护）

### 🚧 待实现的功能

- 邮箱登录支持
- 工作流可视化编辑器
- 实时数据更新
- 更多认证提供者

## 项目结构

```plaintext
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # 国际化路由
│   │   │   ├── (dashboard)/   # 受保护的仪表板页面
│   │   │   ├── (default-layout)/ # 默认布局页面
│   │   │   └── page.tsx       # 首页
│   │   ├── api/               # API 路由
│   │   │   └── auth/          # NextAuth API 路由
│   │   └── layout.tsx         # 根布局
│   ├── components/            # React 组件
│   │   ├── atoms/            # 基础组件
│   │   ├── molecules/        # 复合组件
│   │   ├── organisms/        # 复杂组件
│   │   └── providers/        # 上下文提供者
│   ├── service/              # API 服务层
│   │   ├── auth.ts           # 认证服务
│   │   ├── request.ts        # 请求服务
│   │   └── index.ts          # 服务导出
│   ├── lib/                  # 工具函数
│   ├── styles/               # 样式文件
│   ├── i18n/                 # 国际化配置
│   ├── auth.ts               # NextAuth 配置
│   └── middleware.ts         # 中间件
├── public/                   # 静态资源
├── docs/                     # 文档
└── package.json              # 依赖配置
```

## 开发命令

```bash
# 开发
pnpm dev                    # 启动开发服务器（端口 8800）
pnpm dev:turbo             # 使用 Turbopack 启动（端口 8801）

# 构建
pnpm build                 # 生产构建
pnpm start                 # 启动生产服务器（端口 8802）

# 代码质量
pnpm lint                  # ESLint 检查
pnpm lint:fix              # 自动修复 lint 问题
pnpm format                # Prettier 格式化
pnpm format:check          # 检查格式化

# 组件管理
pnpm comp:add <component>  # 添加 Shadcn UI 组件

# 翻译
pnpm translate             # 运行翻译脚本
```

## 认证架构

### 认证流程概述

Telos Web 采用基于 NextAuth.js v5 的现代化认证架构，结合服务端 JWT 验证：

1. **前端认证**：NextAuth.js 处理 OAuth 流程和会话管理
2. **服务端验证**：后端 API 通过 httpOnly cookie 验证用户身份
3. **无状态设计**：前端不直接处理 JWT token，提高安全性

### 详细认证流程

#### 登录流程

1. **用户发起登录**
   - 用户访问 `/auth/signin`
   - 点击 "使用 GitHub 登录"

2. **OAuth 授权**
   - 重定向到 GitHub 授权页面
   - 用户授权后返回应用

3. **NextAuth 处理**
   - NextAuth 处理 OAuth 回调
   - 创建 JWT session token
   - 设置 httpOnly cookie

4. **后端同步**
   - 触发 `signIn` 事件回调
   - 调用 `AuthService.signIn()` 同步用户信息到后端
   - 后端创建或更新用户记录

5. **完成登录**
   - 重定向到仪表板或原始页面
   - 用户状态更新为已认证

#### API 请求认证

1. **自动 Cookie 发送**
   - 所有 API 请求使用 `credentials: 'include'`
   - 浏览器自动发送 httpOnly cookie

2. **服务端验证**
   - 后端从 cookie 中提取 session token
   - 验证 token 有效性
   - 返回用户信息和响应

3. **错误处理**
   - 无效 token 返回 401 状态
   - 前端自动重定向到登录页面

#### 登出流程

1. **前端登出**
   - 用户点击登出按钮
   - 调用 `AuthService.signOut()` 通知后端

2. **后端清理**
   - 后端清理用户会话状态
   - 返回登出确认

3. **NextAuth 清理**
   - 执行 NextAuth 的 `signOut()`
   - 清除 httpOnly cookie
   - 重定向到首页

### 路由保护

- **中间件检查**：`middleware.ts` 自动检查受保护的路由
- **服务端验证**：每个受保护页面通过 `auth()` 函数验证
- **客户端状态**：使用 `useSession()` 显示用户状态

### 安全特性

- **httpOnly Cookies**：JWT token 存储在 httpOnly cookie 中，防止 XSS 攻击
- **CSRF 保护**：NextAuth 自动处理 CSRF 保护
- **安全重定向**：所有重定向都经过验证
- **会话管理**：自动会话刷新和过期处理

## API 服务层

### AuthService

提供认证相关的 API 调用：

```typescript
// 用户登录
AuthService.signIn(userData: SignInData)

// 用户登出
AuthService.signOut(userId: string)

// 同步用户信息
AuthService.syncUser(userData: UserData)

// 获取当前用户
AuthService.getCurrentUser()

// 更新用户信息
AuthService.updateUser(userId: string, userData: Partial<BackendUser>)
```

### RequestService

统一的 HTTP 请求服务：

```typescript
// 自动包含 credentials
requestService.get('/api/users/profile')
requestService.post('/api/auth/signout', { userId })
```

## 环境变量

| 变量名                 | 描述                       | 必需 |
| ---------------------- | -------------------------- | ---- |
| `AUTH_SECRET`          | NextAuth 密钥              | ✅   |
| `NEXTAUTH_URL`         | 应用 URL                   | ✅   |
| `GITHUB_CLIENT_ID`     | GitHub OAuth Client ID     | ✅   |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | ✅   |
| `NEXT_PUBLIC_API_URL`  | 后端 API 地址              | ❌   |
| `NEXT_PUBLIC_DOMAIN`   | 公开域名                   | ❌   |
| `NEXT_PUBLIC_NODE_ENV` | 环境标识                   | ❌   |

## 部署

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 设置环境变量
3. 更新 GitHub OAuth 应用的回调 URL
4. 部署

### 其他平台

确保设置正确的环境变量和 GitHub OAuth 回调 URL。

## 故障排除

### 常见问题

1. **GitHub 登录失败**
   - 检查 Client ID 和 Secret 是否正确
   - 确认回调 URL 配置正确
   - 查看浏览器控制台错误

2. **API 请求失败**
   - 检查 `NEXT_PUBLIC_API_URL` 是否正确
   - 确认后端服务正在运行
   - 查看网络请求的 cookie 是否正确发送

3. **会话问题**
   - 检查 AUTH_SECRET 是否设置
   - 确认 NEXTAUTH_URL 正确
   - 清除浏览器缓存和 cookies

4. **路由重定向问题**
   - 检查中间件配置
   - 确认路由保护逻辑

### 调试模式

开发环境已启用 NextAuth 调试模式，查看控制台日志获取详细信息。

### 网络调试

使用浏览器开发者工具检查：

- Network 标签页中的请求是否包含 cookie
- Application 标签页中的 Cookies 是否正确设置
- Console 标签页中的错误信息

## 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 查看 [LICENSE](../../LICENSE) 文件了解详情。
