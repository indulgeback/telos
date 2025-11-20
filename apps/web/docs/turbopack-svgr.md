# Turbopack + SVGR 完整集成指南

本文档提供了一套完整的方案，用于在 Next.js (Turbopack) 项目中集成 SVGR，实现 SVG 图标的自动化管理和组件化使用。

## 1. 方案概述

本方案的核心优势：

- **自动化注册**：无需手动 import 每个 SVG，放入指定目录即可使用。
- **组件化封装**：提供统一的 `<SvgIcon />` 组件，支持代码补全和动态加载。
- **类型安全**：完整的 TypeScript 支持。
- **高性能**：构建时优化 SVG，运行时零请求。

## 2. 安装依赖

在 `apps/web` 目录下安装必要的依赖：

```bash
pnpm add -D @svgr/webpack --filter ./apps/web
```

## 3. 配置文件 setup

### 3.1 配置 `next.config.ts`

修改 `next.config.ts` 以配置 Turbopack 的 loader 规则。

```typescript
import type { NextConfig } from 'next'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import path from 'path'

const codeInspectorRules =
  codeInspectorPlugin({
    bundler: 'turbopack',
  }) || {}

const nextConfig: NextConfig = {
  // ... 其他配置
  turbopack: {
    // 确保 root 指向项目根目录（如果是 monorepo）
    root: path.join(process.cwd(), '../../'),
    rules: {
      ...codeInspectorRules,
      // 配置 SVG 规则
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              icon: true,
              svgo: true, // 开启 SVG 优化
              dimensions: false, // 移除默认宽高，方便 CSS 控制
            },
          },
        ],
        as: '*.js', // 告诉 Turbopack 将结果视为 JS 模块
      },
    },
  },
}

export default nextConfig
```

### 3.2 添加类型定义

我们需要两个类型定义文件来解决 TypeScript 报错。

**1. `apps/web/svg.d.ts`** (定义 SVG 模块)

```typescript
declare module '*.svg' {
  import type { ComponentType, SVGProps } from 'react'
  const Component: ComponentType<SVGProps<SVGSVGElement>>
  export default Component
}
```

**2. `apps/web/src/types/require-context.d.ts`** (定义 require.context)

```typescript
interface RequireContext {
  keys(): string[]
  (id: string): any
  <T>(id: string): T
  resolve(id: string): string
  id: string
}

interface NodeRequire {
  context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp,
    mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once'
  ): RequireContext
}

declare var require: NodeRequire
```

## 4. 核心逻辑实现

### 4.1 创建图标注册表 (`svg-registry.ts`)

创建 `apps/web/src/lib/icons/svg-registry.ts`。这个文件负责自动扫描目录并注册所有图标。

```typescript
import type { ComponentType, SVGProps } from 'react'

// 使用 require.context 自动扫描目录
// 参数说明: 目录路径, 是否递归子目录, 匹配文件的正则
const svgContext = require.context('../../assets/images/svgs', true, /\.svg$/)

export type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>
export type SvgRegistry = Record<string, SvgComponent>

// 将路径片段转换为 kebab-case (例如: MyIcon -> my-icon)
const normalizeSegment = (segment: string) =>
  segment
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

// 根据文件路径生成唯一的图标名称
const buildRegistryName = (filePath: string) => {
  const normalizedPath = filePath
    .replace(/^.*assets\/images\/svgs\//, '') // 移除基础路径
    .replace(/^\.\//, '')
    .replace(/\.svg$/, '')
    .replace(/\\/g, '/')

  const kebabCasePath = normalizedPath
    .split('/')
    .filter(Boolean)
    .map(normalizeSegment)
    .join('-')

  return `icon-${kebabCasePath}`
}

// 构建注册表对象
export const svgRegistry: SvgRegistry = svgContext
  .keys()
  .reduce((registry: SvgRegistry, path: string) => {
    const mod = svgContext(path)
    const registryName = buildRegistryName(path)
    // 兼容 ES Module 和 CommonJS 导出
    registry[registryName] = mod.default || mod
    return registry
  }, {} as SvgRegistry)

// 获取组件的工具函数
export const getSvgComponent = (svgName: string): SvgComponent | undefined => {
  const normalizedName = svgName.startsWith('icon-')
    ? svgName
    : `icon-${svgName}`
  return svgRegistry[normalizedName]
}

// 获取所有可用图标名称
export const getAvailableSvgNames = () => Object.keys(svgRegistry)

// 开发环境打印加载的图标，方便调试
if (process.env.NODE_ENV === 'development') {
  console.log('[SVG Registry] 已加载的图标:', getAvailableSvgNames().sort())
}
```

### 4.2 创建统一组件 (`SvgIcon.tsx`)

创建 `apps/web/src/components/atoms/SvgIcon.tsx`。

```tsx
'use client'

import { createElement, type ReactNode, type SVGProps } from 'react'
import { getSvgComponent } from '@/lib/icons/svg-registry'
import { cn } from '@/lib/utils'

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
  name: string
  fallback?: ReactNode
  size?: number | string
}

export function SvgIcon({
  name,
  className,
  fallback = null,
  size,
  ...props
}: SvgIconProps) {
  const sizeProps = size ? { width: size, height: size } : {}
  const IconComponent = getSvgComponent(name)

  if (!IconComponent) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SvgIcon] 未找到名称为 ${name} 的图标`)
    }
    return fallback
  }

  // 使用 createElement 而不是 JSX 语法
  // 这样做是为了符合 React 19 的严格规则，避免 "Cannot create components during render" 错误
  return createElement(IconComponent, {
    className: cn('inline-block', className),
    ...sizeProps,
    ...props,
  })
}
```

> [!NOTE]
> **React 19 兼容性说明**
>
> 我们使用 `createElement(IconComponent, {...})` 而不是 `<IconComponent {...} />` JSX 语法。
>
> React 19 对"在渲染过程中创建组件"有更严格的检查。虽然 `getSvgComponent(name)` 实际上只是从预先构建的注册表中查找组件引用（不会创建新组件），但 React 的静态分析无法确定这一点。使用 `createElement` 可以避免触发此警告，同时保持完全相同的功能和性能。

## 5. 使用指南

### 5.1 添加图标

只需将 SVG 文件放入 `apps/web/src/assets/images/svgs/` 目录即可。支持子目录。

例如：

- `src/assets/images/svgs/user.svg` -> 名称: `icon-user`
- `src/assets/images/svgs/social/facebook.svg` -> 名称: `icon-social-facebook`

### 5.2 使用组件

```tsx
import { SvgIcon } from '@/components/atoms/SvgIcon'

export default function MyComponent() {
  return (
    <div className='flex gap-4'>
      {/* 基础用法 */}
      <SvgIcon name='icon-user' />

      {/* 使用 Tailwind 设置颜色和大小 */}
      <SvgIcon name='icon-user' className='w-8 h-8 text-blue-500' />

      {/* 使用 size 属性 (单位默认 px) */}
      <SvgIcon name='icon-social-facebook' size={32} />

      {/* 使用 size 属性 (字符串) */}
      <SvgIcon name='icon-social-facebook' size='2rem' />
    </div>
  )
}
```

## 6. 性能分析

### 6.1 打包体积 (Bundle Size)

- **机制**: 本方案使用 `require.context`，这意味着**所有**在 `src/assets/images/svgs` 目录下的图标都会被打包进应用的主 Bundle (或共享 Chunk) 中。
- **影响**:
  - **优点**: 运行时无需额外网络请求，图标显示无延迟（无闪烁）。
  - **缺点**: 如果图标数量非常巨大（例如 > 1000 个），会显著增加初始 JS 体积。
- **建议**: 对于常规项目（几百个图标以内），这种开销是完全可以接受的，且通常优于发起数百个 HTTP 请求。

### 6.2 运行时性能 (Runtime)

- **查找**: 图标通过哈希表（Object）存储，查找时间复杂度为 O(1)，极快。
- **渲染**: SVG 被编译为 React 组件，享受 React 的 Virtual DOM 优化。

### 6.3 优化策略

- **SVGO**: 配置中已开启 `svgo: true`，构建时会自动压缩 SVG 内容（去除无用元数据、注释等），减小体积。
- **按需加载 (进阶)**: 如果图标库增长到影响性能的程度，可以考虑将不常用的图标移至另一个目录，或修改 `svg-registry.ts` 逻辑改为动态 import (需要更复杂的构建配置)。目前方案对于绝大多数应用是最佳平衡点。
