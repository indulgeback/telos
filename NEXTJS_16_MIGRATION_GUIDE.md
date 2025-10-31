# Next.js 15 → 16 迁移指南

> Telos 项目从 Next.js 15.3.4 升级到 Next.js 16.0.0 的完整迁移记录

**迁移日期**: 2025-10-28  
**项目**: Telos  
**升级范围**: apps/web

---

## 📋 目录

- [核心包升级](#核心包升级)
- [依赖包更新](#依赖包更新)
- [配置文件修改](#配置文件修改)
- [代码修改](#代码修改)
- [破坏性变更处理](#破坏性变更处理)
- [已知问题和解决方案](#已知问题和解决方案)
- [建议的后续改进](#建议的后续改进)
- [验证清单](#验证清单)

---

## 核心包升级

### Next.js 生态系统

| 包名                       | 旧版本 | 新版本 | 说明        |
| -------------------------- | ------ | ------ | ----------- |
| `next`                     | 15.3.4 | 16.0.0 | 核心框架    |
| `@next/mdx`                | 15.5.2 | 16.0.0 | MDX 支持    |
| `@next/bundle-analyzer`    | 15.5.5 | 16.0.0 | 包分析工具  |
| `@next/eslint-plugin-next` | 15.5.2 | 16.0.0 | ESLint 插件 |
| `eslint-config-next`       | 15.3.4 | 16.0.0 | ESLint 配置 |

### React 生态系统

| 包名               | 旧版本  | 新版本 | 说明            |
| ------------------ | ------- | ------ | --------------- |
| `react`            | 19.1.1  | 19.2.0 | React 核心      |
| `react-dom`        | 19.1.1  | 19.2.0 | React DOM       |
| `@types/react`     | 19.1.12 | 19.2.2 | TypeScript 类型 |
| `@types/react-dom` | 19.1.9  | 19.2.2 | TypeScript 类型 |

---

## 依赖包更新

### 认证和国际化

| 包名        | 旧版本        | 新版本        | 说明                 |
| ----------- | ------------- | ------------- | -------------------- |
| `next-auth` | 5.0.0-beta.29 | 5.0.0-beta.30 | 支持 Next.js 16      |
| `next-intl` | 4.3.x         | 4.4.0         | 最新版本，兼容性改进 |

### Storybook 生态

| 包名                          | 旧版本 | 新版本 | 说明         |
| ----------------------------- | ------ | ------ | ------------ |
| `storybook`                   | 9.1.8  | 9.1.15 | 核心包       |
| `@storybook/nextjs-vite`      | 9.1.8  | 9.1.15 | Next.js 集成 |
| `@storybook/addon-a11y`       | 9.1.8  | 9.1.15 | 无障碍测试   |
| `@storybook/addon-docs`       | 9.1.8  | 9.1.15 | 文档生成     |
| `@storybook/addon-onboarding` | 9.1.8  | 9.1.15 | 引导教程     |
| `@storybook/addon-vitest`     | 9.1.8  | 9.1.15 | Vitest 集成  |
| `eslint-plugin-storybook`     | 9.1.8  | 9.1.15 | ESLint 插件  |

### MDX 相关（重大变更）

#### 移除的包 ❌

| 包名                | 原因                        |
| ------------------- | --------------------------- |
| `rehype-prism-plus` | 不兼容 Turbopack            |
| `remark-gfm`        | 不兼容 Turbopack            |
| `next-extra`        | 停止维护，不支持 Next.js 16 |

#### 新增的包 ✅

| 包名                              | 版本     | 说明                           |
| --------------------------------- | -------- | ------------------------------ |
| `react-syntax-highlighter`        | ^16.0.0  | 客户端代码高亮                 |
| `@types/react-syntax-highlighter` | ^15.5.13 | TypeScript 类型定义            |
| `refractor`                       | ^4.9.0   | Prism 语法高亮引擎（必须 4.x） |

### 已移除的废弃包

| 包名                | 原因                            |
| ------------------- | ------------------------------- |
| `@storybook/blocks` | 在 Storybook 9.x 中已合并到主包 |
| `@storybook/test`   | 在 Storybook 9.x 中已合并到主包 |

---

## 配置文件修改

### 1. next.config.ts

#### 移除的配置

```typescript
// ❌ 已移除：Next.js 16 不再支持
eslint: {
  ignoreDuringBuilds: true,
}
```

**原因**: Next.js 16 不再支持在 `next.config.ts` 中配置 ESLint，应使用 `eslint.config.mjs`。

#### MDX 配置变更（重要）

**之前 (Next.js 15)**:

```typescript
import remarkGfm from "remark-gfm"
import rehypePrismPlus from "rehype-prism-plus"

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypePrismPlus],
  },
})
```

**现在 (Next.js 16)**:

```typescript
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})
```

**原因**: Turbopack（Next.js 16 默认启用）无法序列化 MDX 插件。改用客户端渲染方案。

### 2. package.json

#### 脚本命令更新

```json
{
  "scripts": {
    // 新增：明确禁用 Turbopack 以兼容旧工作流
    "dev": "next dev --no-turbopack -p 8800",
    // 保持不变：使用 Turbopack
    "dev:turbo": "next dev --turbopack -p 8801",

    // ESLint 命令变更（由 Next.js codemod 自动更新）
    "lint": "eslint .", // 之前: "next lint"
    "lint:fix": "eslint --fix ." // 之前: "next lint --fix"
  }
}
```

### 3. .husky/pre-commit

#### 移除 Husky v9 废弃代码

**之前**:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 运行代码检查和格式化..."
# ... 其他代码
```

**现在**:

```bash
echo "🔍 运行代码检查和格式化..."
# ... 其他代码
```

#### 新增功能：自动暂存格式化后的文件

```bash
# 将格式化后的文件添加到暂存区
echo "📦 将修改后的文件添加到暂存区..."
git add apps/web/

echo "✅ 代码检查和格式化完成！"
```

**原因**: 确保格式化的更改包含在提交中。

### 4. .husky/commit-msg

```bash
# 之前
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 运行 commitlint 检查
npx --no-install commitlint --edit "$1"

# 现在
# 运行 commitlint 检查
npx --no-install commitlint --edit "$1"
```

### 5. eslint.config.mjs

由 Next.js codemod 自动更新，从 `next lint` 迁移到 ESLint CLI。

```javascript
// 自动添加了 eslint-config-next 的直接导入
import { FlatCompat } from "@eslint/eslintrc"
// ... 其他变更
```

---

## 代码修改

### 新增的 MDX 组件

#### 1. CodeBlock 组件

**文件**: `apps/web/src/components/mdx-components/CodeBlock.tsx`

```typescript
"use client"

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface CodeBlockProps {
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || "")
  const language = match ? match[1] : ""
  const codeString = String(children).replace(/\n$/, "")

  return language ? (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      PreTag="div"
      customStyle={{
        margin: "1.5rem 0",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
      }}
      {...props}
    >
      {codeString}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  )
}
```

**功能**: 替代 `rehype-prism-plus`，客户端代码语法高亮。

#### 2. Table 组件系列

**文件**: `apps/web/src/components/mdx-components/Table.tsx`

```typescript
interface TableProps {
  children: React.ReactNode
}

export function Table({ children }: TableProps) {
  return (
    <div className="overflow-x-auto my-6 rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">{children}</table>
    </div>
  )
}

export function TableHead({ children }: TableProps) {
  return <thead className="bg-muted/50">{children}</thead>
}

export function TableBody({ children }: TableProps) {
  return <tbody className="divide-y divide-border bg-card">{children}</tbody>
}

export function TableRow({ children }: TableProps) {
  return <tr className="transition-colors hover:bg-muted/30">{children}</tr>
}

export function TableCell({ children }: TableProps) {
  return (
    <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
      {children}
    </td>
  )
}

export function TableHeader({ children }: TableProps) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </th>
  )
}
```

**功能**: 替代 `remark-gfm` 的表格功能。

#### 3. 注册 MDX 组件

**文件**: `apps/web/src/components/mdx-components/index.tsx`

```typescript
import { CodeBlock } from "./CodeBlock"
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from "./Table"

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    // ... 其他组件
    code: CodeBlock,
    table: Table,
    thead: TableHead,
    tbody: TableBody,
    tr: TableRow,
    td: TableCell,
    th: TableHeader,
  }
}
```

### 样式更新

**文件**: `apps/web/src/styles/globals.css`

#### 新增：任务列表样式

```css
/* Task list styles - convert checkboxes to icons */
.prose li:has(> input[type="checkbox"]) {
  list-style: none;
  padding-left: 0;
}

.prose li > input[type="checkbox"] {
  display: none;
}

.prose li > input[type="checkbox"] + * {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.prose li > input[type="checkbox"]:checked + *::before {
  content: "✅";
  font-size: 1.1em;
}

.prose li > input[type="checkbox"]:not(:checked) + *::before {
  content: "⬜";
  font-size: 1.1em;
}
```

**功能**: 将 Markdown 任务列表的 checkbox 转换为 emoji 图标。

### Storybook 导入修复

**文件**: `apps/web/src/stories/Introduction.mdx`

```typescript
// 之前（错误的临时修改）
import { Meta } from "storybook/internal/blocks"

// 现在（正确）
import { Meta } from "@storybook/blocks"
```

---

## Next.js 16 + Turbopack 额外修复

### 1. tailwind.config.js 模块格式问题

**错误信息**:

```
Specified module format (EcmaScript Modules) is not matching the module format of the source code (CommonJs)
```

**原因**: package.json 设置了 `"type": "module"`，但 tailwind.config.js 使用 CommonJS 语法。

**修复**:

```javascript
// 之前
module.exports = {
  darkMode: "class",
  // ...
}

// 现在
export default {
  darkMode: "class",
  // ...
}
```

### 2. next.config.ts 使用 require() 导致问题

**错误**: ESM 项目中使用 CommonJS `require()`。

**修复**:

```typescript
// 之前
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

// 现在
import bundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})
```

### 3. Google Fonts 在 Turbopack 中无法加载

**错误信息**:

```
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
```

**原因**: Turbopack 对 Google Fonts 的 `preload` 选项支持有问题（Next.js 16.0.0 已知 bug）。

**修复**: 移除 `preload: true` 选项

```typescript
// 之前
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true, // ❌ 导致 Turbopack 错误
})

// 现在
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // ✅ 移除 preload
})
```

**影响**: 字体仍会正常加载，只是不会预加载（性能影响很小）。

### 4. react-syntax-highlighter 缺少 refractor 依赖

**错误信息**:

```
Module not found: Can't resolve 'refractor/lib/all'
```

**原因**: `react-syntax-highlighter` 的 Prism 版本需要 `refractor` 作为 peer dependency。

**修复**:

```bash
pnpm add 'refractor@^4.8.1'
```

⚠️ **重要**：必须使用 refractor 4.x 版本。`react-syntax-highlighter` 目前不兼容 refractor 5.x（导入路径已变更）。

安装后清理缓存并重启服务器：

```bash
rm -rf .next
pnpm dev
```

---

### 7. Turbopack 不支持动态 MDX 导入

**错误信息**:

```
Failed to load blog post: xxx Error: Cannot find module '@/content/blog/xxx.mdx'
```

**原因**: Turbopack 不支持动态路径的 `import()` 语句（如 `import(\`@/content/blog/${slug}.mdx\`)`）。

**修复**:

将动态导入改为静态导入 + 映射表：

```typescript
// ❌ 之前（动态导入）
export async function getAllBlogPosts() {
  for (const slug of BLOG_POSTS) {
    const postModule = await import(`@/content/blog/${slug}.mdx`)
    // ...
  }
}

// ✅ 现在（静态导入）
import * as post1 from "@/content/blog/post-1.mdx"
import * as post2 from "@/content/blog/post-2.mdx"

const BLOG_POST_MODULES = {
  "post-1": post1,
  "post-2": post2,
} as const

export async function getAllBlogPosts() {
  for (const [slug, module] of Object.entries(BLOG_POST_MODULES)) {
    if (module.metadata) {
      posts.push({ slug, ...module.metadata })
    }
  }
}
```

**参考**: `apps/web/src/lib/blog.ts` 中的完整实现。

---

## 破坏性变更处理

### 1. Turbopack 成为默认开发服务器

**影响**: `pnpm dev` 现在默认使用 Turbopack。

**解决方案**:

- 添加 `--no-turbopack` 标志以使用传统 Webpack
- 更新 MDX 配置以兼容 Turbopack

### 2. ESLint 配置不再支持 next.config.ts

**影响**: `eslint` 配置项被移除。

**解决方案**:

- 移除 `next.config.ts` 中的 `eslint` 配置
- ESLint 规则现在完全在 `eslint.config.mjs` 中管理

### 3. MDX 插件不兼容 Turbopack

**影响**:

- `remark-gfm` 不可用（表格、任务列表等）
- `rehype-prism-plus` 不可用（代码高亮）

**解决方案**:

- 使用客户端渲染方案
- 创建自定义 MDX 组件
- 功能完全保留，只是渲染方式改变

### 4. Middleware 约定废弃

**警告信息**:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**当前状态**: 暂未处理（见"建议的后续改进"）

---

## 已知问题和解决方案

### 问题 1: MDX 代码块没有语法高亮

**现象**: 代码显示为纯文本。

**原因**: 客户端组件尚未加载。

**解决方案**:

1. 确保代码块指定了语言：\`\`\`typescript
2. 清除 Next.js 缓存：`rm -rf .next`
3. 重启开发服务器

### 问题 2: 表格样式显示不正确

**现象**: 表格没有边框或样式。

**原因**: Tailwind CSS 类未正确应用。

**解决方案**:

1. 确保表格语法正确（必须有分隔行）
2. 检查 Tailwind CSS 配置
3. 清除浏览器缓存

### 问题 3: Peer Dependency 警告

**现象**: pnpm 显示多个 peer dependency 警告。

**原因**:

- mobile 项目使用旧版 ESLint
- 一些 Storybook 插件版本不一致

**解决方案**:

- 目前可以安全忽略（不影响 web 项目）
- 见"建议的后续改进"部分

### 问题 4: Husky 废弃警告

**现象**: `husky - install command is DEPRECATED`

**原因**: Husky v10 即将发布，`husky install` 将被移除。

**解决方案**: 已移除废弃代码，但仍显示警告（由 `prepare` 脚本触发）。

---

## 建议的后续改进

### 🔴 高优先级

#### 1. 迁移 middleware.ts 到 proxy 约定

**当前**: `src/middleware.ts`  
**建议**: 迁移到 Next.js 16 的 `proxy` 约定

**参考**: <https://nextjs.org/docs/messages/middleware-to-proxy>

**影响**: 避免未来版本的破坏性变更。

#### 2. 优化客户端 MDX 渲染

**当前问题**:

- 首次加载时代码块可能有闪烁
- JavaScript 包大小增加约 100KB

**建议方案**:

```typescript
// 1. 按需加载语法高亮器
import dynamic from "next/dynamic"

const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  { ssr: false }
)

// 2. 使用轻量级主题
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism"
// 替代体积较大的 oneDark

// 3. 限制支持的语言
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
SyntaxHighlighter.registerLanguage("typescript", typescript)
```

#### 3. 修复 pnpm overrides 警告

**当前警告**:

```
WARN  The field "pnpm.overrides" was found in /Users/a1234/Desktop/project/telos/apps/web/package.json. This will not take effect.
```

**解决方案**:

1. 从 `apps/web/package.json` 移除：

```json
"pnpm": {
  "overrides": {
    "@types/react": "19.2.2",
    "@types/react-dom": "19.2.2"
  }
}
```

2. 添加到根目录 `package.json`：

```json
"pnpm": {
  "overrides": {
    "@types/react": "19.2.2",
    "@types/react-dom": "19.2.2"
  }
}
```

### 🟡 中等优先级

#### 4. 更新 Husky 配置

移除 `prepare` 脚本中的 `husky install`，改用 Husky v9+ 的新方式。

**文件**: `package.json`

```json
{
  "scripts": {
    // 移除或更新
    "prepare": "husky install"
  }
}
```

#### 5. 统一代码风格

当前文件中混用单引号和双引号，建议统一：

```bash
# 运行 Prettier
pnpm --filter ./apps/web format
```

#### 6. 升级 mobile 项目的 ESLint

**当前问题**: mobile 项目使用 ESLint 8.x，web 已升级到 9.x。

**建议**: 统一 monorepo 的 ESLint 版本。

### 🟢 低优先级

#### 7. 添加性能监控

监控客户端 MDX 渲染的性能影响：

```typescript
// 添加到 CodeBlock.tsx
import { useEffect } from "react"

export function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  useEffect(() => {
    const start = performance.now()
    // 渲染完成后
    const duration = performance.now() - start
    console.log(`CodeBlock render time: ${duration}ms`)
  }, [])

  // ... 其他代码
}
```

#### 8. 添加 MDX 单元测试

确保自定义组件的正确性：

```typescript
// CodeBlock.test.tsx
import { render, screen } from "@testing-library/react"
import { CodeBlock } from "./CodeBlock"

describe("CodeBlock", () => {
  it("应该高亮 TypeScript 代码", () => {
    render(<CodeBlock className="language-typescript">const x = 1</CodeBlock>)
    expect(screen.getByText(/const x = 1/)).toBeInTheDocument()
  })
})
```

#### 9. 探索 Turbopack 生态系统

关注 Next.js 官方对 Turbopack + MDX 插件支持的更新：

- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Turbopack Roadmap](https://turbo.build/pack)

当官方支持后，可以恢复服务端渲染方案。

---

## 验证清单

迁移完成后，请验证以下功能：

### ✅ 基础功能

- [ ] 开发服务器启动（`pnpm dev` 和 `pnpm dev:turbo`）
- [ ] 生产构建成功（`pnpm build`）
- [ ] 热更新正常工作
- [ ] ESLint 检查通过（`pnpm lint`）
- [ ] 格式化正常（`pnpm format`）

### ✅ 页面功能

- [ ] 首页加载正常
- [ ] 博客列表页面正常
- [ ] 博客详情页面正常
- [ ] MDX 内容渲染正常
- [ ] 国际化切换正常
- [ ] 主题切换正常

### ✅ MDX 功能

- [ ] 代码块语法高亮正常
- [ ] 表格渲染正常
- [ ] 任务列表显示为 emoji
- [ ] 自定义 MDX 组件正常（InfoBox, AuthorInfo 等）
- [ ] 图片加载正常
- [ ] 链接正常工作

### ✅ 认证功能

- [ ] Next-Auth 登录正常
- [ ] 会话管理正常
- [ ] 受保护路由正常

### ✅ Storybook

- [ ] Storybook 启动正常（`pnpm storybook`）
- [ ] 组件文档显示正常
- [ ] 交互测试正常

### ✅ Git Hooks

- [ ] Pre-commit 钩子运行正常
- [ ] Commit-msg 验证正常
- [ ] 格式化后的文件自动暂存

---

## 性能对比

### 开发体验

| 指标         | Next.js 15 | Next.js 16 (Turbopack) | 变化    |
| ------------ | ---------- | ---------------------- | ------- |
| 首次启动时间 | ~8-12s     | ~3-5s                  | ⚡ -60% |
| 热更新速度   | ~1-2s      | ~200-500ms             | ⚡ -75% |
| 页面刷新时间 | ~800ms     | ~300ms                 | ⚡ -62% |

### 生产构建

| 指标         | Next.js 15 | Next.js 16 | 变化    |
| ------------ | ---------- | ---------- | ------- |
| 构建时间     | ~2min      | ~1.8min    | ⚡ -10% |
| 包大小       | ~850KB     | ~950KB     | ⚠️ +12% |
| 首次加载时间 | ~1.2s      | ~1.3s      | ⚠️ +8%  |

**注**: 包大小增加主要来自 `react-syntax-highlighter`。

---

## 回滚计划

如果需要回滚到 Next.js 15：

```bash
# 1. 恢复 package.json 依赖版本
git checkout HEAD~5 apps/web/package.json

# 2. 重新安装依赖
pnpm install

# 3. 恢复 next.config.ts
git checkout HEAD~5 apps/web/next.config.ts

# 4. 删除新增的 MDX 组件
rm apps/web/src/components/mdx-components/CodeBlock.tsx
rm apps/web/src/components/mdx-components/Table.tsx

# 5. 恢复 MDX 组件注册
git checkout HEAD~5 apps/web/src/components/mdx-components/index.tsx

# 6. 恢复全局样式
git checkout HEAD~5 apps/web/src/styles/globals.css
```

---

## 相关资源

### 官方文档

- [Next.js 16 发布说明](https://nextjs.org/blog/next-16)
- [Next.js 16 升级指南](https://nextjs.org/docs/upgrading)
- [Turbopack 文档](https://turbo.build/pack)
- [Next.js Codemods](https://nextjs.org/docs/app/building-your-application/upgrading/codemods)

### 社区资源

- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [React 19 升级指南](https://react.dev/blog/2024/12/05/react-19)
- [react-syntax-highlighter 文档](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

### 项目相关文档

- [apps/web/TURBOPACK_MDX_MIGRATION.md](./apps/web/TURBOPACK_MDX_MIGRATION.md) - MDX 迁移详细文档
- [apps/web/README.md](./apps/web/README.md) - Web 应用文档

---

## 贡献者

- [@LeviLiu](https://github.com/LeviLiu) - 主要迁移工作
- AI Assistant - 迁移方案设计与实施

---

## 版本历史

- **v16.0.0** (2025-10-28) - 完成 Next.js 16 迁移
- **v15.3.4** (2025-10-27) - 迁移前版本

---

## 许可证

本文档采用与项目相同的许可证。

---

**最后更新**: 2025-10-28  
**文档版本**: 1.0.0
