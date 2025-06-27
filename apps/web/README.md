# Telos 前端应用

Telos 是一个现代化的 Web 应用，采用 Next.js 15 和 React 19 构建，提供优秀的用户体验和开发体验。

## 🚀 技术栈

- **框架**: Next.js 15.3.4 (App Router)
- **UI 库**: React 19.0.0
- **样式**: Tailwind CSS 4.0
- **类型检查**: TypeScript 5
- **图标**: Lucide React
- **UI 组件**: shadcn/ui (New York 风格)
- **字体**: Geist Sans & Geist Mono
- **开发工具**: ESLint, Turbopack

## 📦 项目结构

```plaintext
apps/web/
├── src/
│   ├── app/                 # Next.js App Router页面
│   │   ├── globals.css      # 全局样式
│   │   ├── layout.tsx       # 根布局组件
│   │   └── page.tsx         # 首页组件
│   ├── assets/              # 静态资源
│   ├── components/          # 可复用组件
│   ├── lib/                 # 工具函数和配置
│   └── services/            # API服务层
├── public/                  # 静态文件
├── components.json          # shadcn/ui配置
├── tailwind.config.js       # Tailwind配置
├── next.config.ts           # Next.js配置
└── package.json             # 项目依赖
```

## 🛠️ 开发环境要求

- Node.js 18.17 或更高版本
- pnpm (推荐) 或 npm

## 📋 安装和运行

### 1. 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 2. 启动开发服务器

```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev
```

开发服务器将在 [http://localhost:3000](http://localhost:3000) 启动，支持热重载和 Turbopack 快速构建。

### 3. 构建生产版本

```bash
# 构建应用
pnpm build

# 启动生产服务器
pnpm start
```

### 4. 代码检查

```bash
# 运行 ESLint 检查
pnpm lint
```

## 🎨 样式和主题

项目使用 Tailwind CSS 4.0 进行样式管理，支持：

- **响应式设计**: 移动端优先的响应式布局
- **深色模式**: 自动适配系统主题
- **CSS 变量**: 使用 CSS 变量实现主题切换
- **组件样式**: 基于 shadcn/ui 的 New York 风格组件

### 自定义样式

全局样式定义在 `src/app/globals.css` 中，包含：

- Tailwind CSS 基础样式
- 自定义 CSS 变量
- 字体配置
- 主题色彩

## 🔧 配置说明

### Next.js 配置 (`next.config.ts`)

- 支持 TypeScript
- 优化构建配置
- 可扩展的配置选项

### Tailwind 配置

- 使用 Tailwind CSS 4.0
- 支持 CSS 变量
- 自定义颜色主题
- 响应式断点配置

### shadcn/ui 配置 (`components.json`)

- New York 风格组件
- TypeScript 支持
- 自定义别名配置
- Lucide 图标库集成

## 📱 功能特性

- ⚡ **快速开发**: 使用 Turbopack 实现快速热重载
- 🎯 **类型安全**: 完整的 TypeScript 支持
- 📱 **响应式**: 移动端优先的响应式设计
- 🌙 **主题支持**: 深色/浅色主题切换
- 🔧 **开发工具**: ESLint 代码质量检查
- 📦 **组件化**: 基于 shadcn/ui 的现代化组件库

## 🚀 部署

### Vercel 部署 (推荐)

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 自动部署和预览

### 其他平台

项目支持部署到任何支持 Node.js 的平台：

- Netlify
- Railway
- DigitalOcean App Platform
- 自托管服务器

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../../LICENSE) 文件了解详情。

MIT 许可证允许您：

- ✅ 自由使用、修改和分发代码
- ✅ 用于商业项目
- ✅ 集成到专有软件中
- ✅ 修改源代码

唯一的要求是保留原始的版权声明和许可证声明。

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Lucide 图标](https://lucide.dev)

---

如有问题或建议，请提交 Issue 或联系开发团队。
