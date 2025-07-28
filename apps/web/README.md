# Telos Web Application

Telos Web 是基于 Next.js 15 构建的现代化前端应用，为 Telos 智能工作流编排平台提供用户界面。

## 技术栈

- **Next.js 15** - React 框架，支持 App Router 和 SSR
- **React 19** - 最新的 React 并发特性
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS 4** - 实用优先的 CSS 框架
- **NextAuth.js** - 身份认证解决方案
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
  - 会话管理
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
- 与后端 API 集成
- 更多认证提供者

## 项目结构

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # 国际化路由
│   │   │   ├── (dashboard)/   # 受保护的仪表板页面
│   │   │   ├── (no-layout)/   # 无布局页面（如登录）
│   │   │   └── page.tsx       # 首页
│   │   ├── api/               # API 路由
│   │   └── layout.tsx         # 根布局
│   ├── components/            # React 组件
│   │   ├── atoms/            # 基础组件
│   │   ├── molecules/        # 复合组件
│   │   ├── organisms/        # 复杂组件
│   │   └── providers/        # 上下文提供者
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

## 认证流程

### 登录流程

1. 用户访问 `/auth/signin`
2. 点击 "使用 GitHub 登录"
3. 重定向到 GitHub 授权页面
4. 用户授权后返回应用
5. NextAuth 处理回调并创建会话
6. 重定向到仪表板或原始页面

### 路由保护

- 中间件自动检查受保护的路由
- 未认证用户重定向到登录页面
- 已认证用户访问登录页面时重定向到首页

### 会话管理

- JWT 策略，会话有效期 30 天
- 自动刷新机制
- 安全的会话存储

## 环境变量

| 变量名                 | 描述                       | 必需 |
| ---------------------- | -------------------------- | ---- |
| `AUTH_SECRET`          | NextAuth 密钥              | ✅   |
| `NEXTAUTH_URL`         | 应用 URL                   | ✅   |
| `GITHUB_CLIENT_ID`     | GitHub OAuth Client ID     | ✅   |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | ✅   |
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

2. **会话问题**
   - 检查 AUTH_SECRET 是否设置
   - 确认 NEXTAUTH_URL 正确
   - 清除浏览器缓存和 cookies

3. **路由重定向问题**
   - 检查中间件配置
   - 确认路由保护逻辑

### 调试模式

开发环境已启用 NextAuth 调试模式，查看控制台日志获取详细信息。

## 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 查看 [LICENSE](../../LICENSE) 文件了解详情。
