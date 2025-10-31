# Turbopack MDX 迁移文档

## 概述

为了支持 Next.js 16 的 Turbopack 模式，我们已将 MDX 配置从服务端插件迁移到客户端渲染方案。

## 变更内容

### 已移除的包

- ❌ `rehype-prism-plus` - 服务端代码高亮
- ❌ `remark-gfm` - GitHub Flavored Markdown 插件
- ❌ `rehype-highlight` - 尝试的替代方案
- ❌ `highlight.js` - 服务端高亮库

### 新增的包

- ✅ `react-syntax-highlighter` - 客户端代码高亮
- ✅ `@types/react-syntax-highlighter` - TypeScript 类型定义

### 新增的组件

#### 1. CodeBlock 组件

**位置**: `src/components/mdx-components/CodeBlock.tsx`

**功能**:

- 客户端代码语法高亮
- 支持 190+ 编程语言
- 使用 Prism 引擎和 oneDark 主题
- 自动检测代码块语言

**使用方式**:
MDX 中的所有代码块自动使用此组件：

\`\`\`typescript
// 代码会自动高亮
const hello = "world"
\`\`\`

#### 2. Table 组件系列

**位置**: `src/components/mdx-components/Table.tsx`

**功能**:

- 完整的表格支持（替代 GFM 表格）
- 响应式设计
- 暗色模式支持
- Hover 效果

**包含组件**:

- `Table` - 表格容器
- `TableHead` - 表头
- `TableBody` - 表体
- `TableRow` - 行
- `TableCell` - 单元格
- `TableHeader` - 标题单元格

**使用方式**:
Markdown 表格语法自动转换：

```markdown
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| A   | B   | C   |
```

### 3. 任务列表样式

**位置**: `src/styles/globals.css`

**功能**:

- 将 checkbox 转换为 emoji 图标
- ✅ 已完成任务
- ⬜ 未完成任务

**使用方式**:

```markdown
- [x] 已完成的任务
- [ ] 未完成的任务
```

## 配置变更

### next.config.ts

```typescript
// 之前：使用服务端插件（不兼容 Turbopack）
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypePrismPlus],
  },
})

// 现在：空配置（兼容 Turbopack）
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})
```

## 功能对比

| 功能      | 之前（服务端）       | 现在（客户端）              | 状态     |
| --------- | -------------------- | --------------------------- | -------- |
| 代码高亮  | ✅ rehype-prism-plus | ✅ react-syntax-highlighter | 完全兼容 |
| 表格支持  | ✅ remark-gfm        | ✅ 自定义 Table 组件        | 完全兼容 |
| 任务列表  | ✅ remark-gfm        | ✅ CSS 样式                 | 完全兼容 |
| Turbopack | ❌ 不兼容            | ✅ 完全兼容                 | 已解决   |
| SEO       | ✅ 服务端渲染        | ⚠️ 客户端渲染               | 轻微影响 |
| 首次加载  | ✅ 立即显示          | ⚠️ 可能闪烁                 | 可接受   |
| 包大小    | ✅ 较小              | ⚠️ 稍大                     | 可接受   |

## 性能影响

### 优势

- ✅ Turbopack 开发速度显著提升
- ✅ 热更新更快
- ✅ 编译时间减少

### 劣势

- ⚠️ 首次页面加载可能有短暂的代码高亮延迟
- ⚠️ JavaScript 包大小增加约 50-100KB（已压缩）
- ⚠️ 代码块内容对搜索引擎不完全友好（但标题和正文内容不受影响）

## 开发指南

### 启动开发服务器

使用 Turbopack（推荐）：

```bash
pnpm dev:turbo
```

使用标准 Webpack（备选）：

```bash
pnpm dev
```

### 编写 MDX 内容

所有现有的 MDX 语法保持不变：

1. **代码块** - 自动高亮

```typescript
const example = 'works'
```

2. **表格** - 自动渲染

   | A   | B   |
   | --- | --- |
   | 1   | 2   |

3. **任务列表** - 自动转换为图标

- [x] 完成
- [ ] 待办

### 自定义主题

修改代码高亮主题：

```typescript
// CodeBlock.tsx
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// 可选主题：
// - tomorrow
// - vs
// - vscDarkPlus
// - atomDark
// - dracula
```

## 故障排查

### 问题：代码块没有高亮

**解决方案**：

1. 确保代码块指定了语言：\`\`\`typescript
2. 清除 Next.js 缓存：`rm -rf .next`
3. 重启开发服务器

### 问题：表格样式不正确

**解决方案**：

1. 确保表格语法正确（必须有分隔行）
2. 检查 Tailwind CSS 是否正确加载
3. 清除浏览器缓存

### 问题：任务列表显示为 checkbox

**解决方案**：

1. 确保 `globals.css` 已导入
2. 检查是否在 `.prose` 类容器中
3. 验证 CSS 选择器优先级

## 未来改进

可能的优化方向：

1. **混合方案**：首屏使用服务端渲染，后续使用客户端
2. **按需加载**：仅在需要时加载语法高亮器
3. **Web Worker**：在后台线程中进行高亮处理
4. **等待 Turbopack 支持**：关注 Next.js 官方的 MDX 插件支持进展

## Turbopack 限制

### 不支持动态 MDX 导入

Turbopack 不支持动态路径的 MDX 导入：

```typescript
// ❌ 不支持
const postModule = await import(`@/content/blog/${slug}.mdx`)

// ✅ 必须使用静态导入
import * as post1 from '@/content/blog/post-1.mdx'
import * as post2 from '@/content/blog/post-2.mdx'

const BLOG_POST_MODULES = {
  'post-1': post1,
  'post-2': post2,
} as const
```

**解决方案**: 使用静态导入 + 映射表（参见 `src/lib/blog.ts`）

**添加新文章时**: 需要手动在 `blog.ts` 中添加对应的 import 语句

## 相关链接

- [react-syntax-highlighter 文档](https://github.com/react-syntax-highlighter/react-syntax-highlighter)
- [Next.js 16 Turbopack 文档](https://nextjs.org/docs/architecture/turbopack)
- [MDX 官方文档](https://mdxjs.com/)
- [Turbopack 动态导入限制](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)

## 版本信息

- Next.js: 16.0.0
- React: 19.2.0
- react-syntax-highlighter: ^16.0.0
- 迁移日期: 2025-10-28
