# 性能优化指南

本文档记录了 Telos Web 应用的性能优化措施和最佳实践。

## 目录

- [Bundle 分析工具](#bundle-分析工具)
- [图片优化](#图片优化)
- [字体优化](#字体优化)
- [性能测试](#性能测试)
- [最佳实践](#最佳实践)

---

## Bundle 分析工具

### 概述

我们使用 `@next/bundle-analyzer` 来分析和优化应用的 JavaScript bundle 大小。

### 使用方法

#### 1. 运行 Bundle 分析

```bash
cd apps/web
pnpm analyze
```

这会在构建后自动打开两个浏览器标签页：

- **Client Bundle** - 客户端 JavaScript bundle 分析
- **Server Bundle** - 服务端 JavaScript bundle 分析

#### 2. 分析报告解读

Bundle Analyzer 会显示：

- 📦 **模块大小** - 每个模块占用的空间
- 📊 **依赖关系** - 模块之间的依赖树
- 🎯 **优化目标** - 可以优化的大型依赖

#### 3. 优化建议

**识别大型依赖：**

- 查找占用空间超过 50KB 的单个模块
- 检查是否有重复的依赖
- 寻找可以延迟加载的模块

**常见优化策略：**

```typescript
// ❌ 不好的做法 - 导入整个库
import _ from 'lodash'

// ✅ 好的做法 - 只导入需要的函数
import debounce from 'lodash/debounce'

// ✅ 动态导入大型组件
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <Skeleton />,
})
```

### 配置说明

Bundle Analyzer 配置在 `next.config.ts` 中：

```typescript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer(withMDX(withNextIntl(nextConfig)))
```

---

## 图片优化

### 概述

我们使用 Next.js Image 组件配合 Sharp 进行自动图片优化。

### Sharp 优化特性

Sharp 是一个高性能的图片处理库，Next.js 会自动使用它来：

- ✅ 转换图片为现代格式（AVIF、WebP）
- ✅ 响应式图片生成
- ✅ 图片压缩和优化
- ✅ 自动调整尺寸

### 图片配置

在 `next.config.ts` 中的配置：

```typescript
images: {
  // 允许的外部图片域名
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'images.unsplash.com',
    },
  ],
  // 优先使用现代图片格式
  formats: ['image/avif', 'image/webp'],
  // 响应式设备尺寸
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  // 图片尺寸预设
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  // 缓存时间（秒）
  minimumCacheTTL: 60,
}
```

### 使用 Next.js Image 组件

#### 基础用法

```typescript
import Image from 'next/image'

function MyComponent() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={675}
      priority // 首屏图片使用 priority
    />
  )
}
```

#### 使用占位符（推荐）

```typescript
import Image from 'next/image'
import { generateBlurDataURL } from '@/lib/image'

function MyComponent() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={675}
      placeholder="blur"
      blurDataURL={generateBlurDataURL(1200, 675)}
    />
  )
}
```

#### 外部图片

```typescript
import Image from 'next/image'

function MyComponent() {
  return (
    <Image
      src="https://images.unsplash.com/photo-123"
      alt="External image"
      width={800}
      height={600}
      style={{ width: '100%', height: 'auto' }}
    />
  )
}
```

### 图片工具函数

我们在 `src/lib/image.ts` 中提供了实用工具：

```typescript
import { generateBlurDataURL, imageLoader } from '@/lib/image'

// 生成模糊占位符
const blurDataURL = generateBlurDataURL(800, 600)

// 自定义图片加载器
<Image
  loader={imageLoader}
  src="/my-image.jpg"
  width={800}
  height={600}
/>
```

### 图片优化最佳实践

#### 1. 选择合适的图片尺寸

```typescript
// ❌ 不好 - 加载过大的图片
<Image src="/4k-image.jpg" width={400} height={300} />

// ✅ 好 - 使用适当尺寸的图片源
<Image src="/optimized-image.jpg" width={400} height={300} />
```

#### 2. 使用 priority 属性

```typescript
// ✅ 首屏可见的图片
<Image src="/hero.jpg" priority />

// ✅ 非首屏图片延迟加载（默认行为）
<Image src="/content.jpg" />
```

#### 3. 提供占位符

```typescript
// ✅ 使用模糊占位符
<Image
  src="/image.jpg"
  placeholder="blur"
  blurDataURL={generateBlurDataURL(800, 600)}
/>
```

#### 4. 响应式图片

```typescript
<Image
  src="/image.jpg"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  style={{ width: '100%', height: 'auto' }}
/>
```

---

## 字体优化

### 概述

我们使用 Next.js 的 `next/font` 进行自动字体优化，包括：

- ✅ 自托管 Google Fonts
- ✅ 自动字体子集化
- ✅ 预加载关键字体
- ✅ 字体显示策略优化

### 字体配置

在 `src/app/layout.tsx` 中配置：

```typescript
import { Inter, Geist, Poppins } from 'next/font/google'

// 主要字体 - 使用 preload
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  preload: true, // 预加载关键字体
})

// 次要字体 - 不预加载
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap', // 字体加载时显示备用字体
})
```

### Font Display 策略

| 策略       | 说明                             | 使用场景           |
| ---------- | -------------------------------- | ------------------ |
| `swap`     | 立即显示备用字体，加载完成后切换 | 推荐用于所有字体   |
| `optional` | 如果加载太慢则使用备用字体       | 不关键的装饰性字体 |
| `fallback` | 短暂空白期后显示备用字体         | 平衡性能和样式     |
| `block`    | 阻塞渲染直到字体加载             | ❌ 不推荐          |

### 预连接优化

我们添加了 Google Fonts 的预连接：

```tsx
<head>
  <link
    rel='preconnect'
    href='https://fonts.googleapis.com'
    crossOrigin='anonymous'
  />
  <link
    rel='preconnect'
    href='https://fonts.gstatic.com'
    crossOrigin='anonymous'
  />
</head>
```

### 字体变量使用

在 CSS 中使用字体变量：

```css
body {
  font-family: var(--font-inter), sans-serif;
}

.heading {
  font-family: var(--font-playfair), serif;
}

.code {
  font-family: var(--font-jetbrains-mono), monospace;
}
```

### 字体优化最佳实践

#### 1. 限制字体数量

```typescript
// ❌ 不好 - 太多字体
import {
  Inter,
  Roboto,
  Poppins,
  Montserrat,
  Lato,
  OpenSans,
} from 'next/font/google'

// ✅ 好 - 2-3 个字体足够
import { Inter, Playfair_Display } from 'next/font/google'
```

#### 2. 只加载需要的字重

```typescript
// ❌ 不好 - 加载所有字重
const poppins = Poppins({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})

// ✅ 好 - 只加载使用的字重
const poppins = Poppins({
  weight: ['400', '600', '700'],
})
```

#### 3. 优先预加载主要字体

```typescript
// ✅ 预加载主要字体
const inter = Inter({
  preload: true,
  display: 'swap',
})

// ✅ 不预加载次要字体
const playfair = Playfair_Display({
  display: 'swap',
})
```

---

## 性能测试

### 使用 Lighthouse

#### 1. Chrome DevTools

1. 打开 Chrome DevTools (F12)
2. 点击 "Lighthouse" 标签
3. 选择 "Performance" 和 "Best Practices"
4. 点击 "Generate report"

#### 2. 命令行工具

```bash
# 安装 Lighthouse CLI
npm install -g lighthouse

# 运行测试
lighthouse http://localhost:8800 --view
```

### 性能指标目标

| 指标    | 目标    | 描述         |
| ------- | ------- | ------------ |
| **FCP** | < 1.8s  | 首次内容绘制 |
| **LCP** | < 2.5s  | 最大内容绘制 |
| **TBT** | < 200ms | 总阻塞时间   |
| **CLS** | < 0.1   | 累积布局偏移 |
| **SI**  | < 3.4s  | 速度指数     |

### Web Vitals 监控

在 `src/app/layout.tsx` 中添加监控：

```typescript
'use client'

export function reportWebVitals(metric) {
  console.log(metric)
  // 发送到分析服务
  if (process.env.NODE_ENV === 'production') {
    // 发送到 Vercel Analytics / Google Analytics
  }
}
```

---

## 最佳实践

### 1. 代码分割

```typescript
// ✅ 路由级别的代码分割（自动）
// Next.js 自动为每个页面创建单独的 bundle

// ✅ 组件级别的代码分割
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'))
```

### 2. Tree Shaking

```typescript
// ✅ 使用 ES6 imports
import { specific } from 'library'

// ❌ 避免 require
const library = require('library')
```

### 3. 缓存策略

```typescript
// next.config.ts
export default {
  images: {
    minimumCacheTTL: 60, // 缓存 60 秒
  },
}
```

### 4. 预加载关键资源

```tsx
<head>
  {/* 预加载关键 CSS */}
  <link rel='preload' href='/critical.css' as='style' />

  {/* 预连接第三方域名 */}
  <link rel='preconnect' href='https://api.example.com' />
</head>
```

### 5. 延迟加载

```typescript
// ✅ 延迟加载非关键组件
const Modal = dynamic(() => import('@/components/Modal'))
const Chart = dynamic(() => import('@/components/Chart'))

// ✅ 延迟加载图片
<Image src="/image.jpg" loading="lazy" />
```

---

## 监控和持续优化

### 定期检查

- ✅ 每周运行一次 Bundle Analyzer
- ✅ 每月运行 Lighthouse 测试
- ✅ 监控生产环境的 Web Vitals

### 优化清单

- [ ] Bundle 大小是否在合理范围内？
- [ ] 所有图片都使用了 Next.js Image 组件？
- [ ] 首屏图片设置了 priority？
- [ ] 字体配置了 display: 'swap'？
- [ ] 大型组件使用了动态导入？
- [ ] 关键资源设置了预加载？

---

## 相关资源

- [Next.js 性能优化文档](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Sharp 文档](https://sharp.pixelplumbing.com/)

---

**最后更新：** 2025-10-15
