# 博客文章目录

这个目录存放所有博客文章的 MDX 文件。每篇文章都是一个独立的 `.mdx` 文件。

## 文件结构

```
content/blog/
├── getting-started-with-workflow-automation.mdx
├── building-scalable-microservices.mdx
├── security-best-practices.mdx
├── introducing-new-api-gateway.mdx
├── optimizing-workflow-performance.mdx
├── case-study-company-x-devops.mdx
└── README.md
```

## 添加新文章

### 1. 创建 MDX 文件

在此目录下创建新的 `.mdx` 文件，文件名使用 kebab-case 格式（例如：`my-new-article.mdx`）

### 2. 添加元数据

每篇文章必须在文件开头导出 metadata 对象：

```mdx
export const metadata = {
  title: '文章标题',
  description: '文章描述',
  author: '作者名称',
  authorBio: '作者简介',
  date: '2024-10-14',
  readTime: '8 min read',
  tags: ['Tag1', 'Tag2', 'Tag3'],

}
```

### 3. 添加作者信息组件

在文章开头添加作者信息：

```mdx
<AuthorInfo
  name='作者名称'
  bio='作者简介'
  date='2024-10-14'
  readTime='8 min read'
/>
```

### 4. 编写内容

使用 Markdown 和可用的 MDX 组件编写文章内容。

### 5. 注册文章 Slug

在 `/lib/blog.ts` 中的 `BLOG_POSTS` 数组添加新文章的 slug：

```typescript
const BLOG_POSTS = [
  // ... 现有文章
  'my-new-article', // 新文章的 slug（不含 .mdx 扩展名）
] as const
```

**注意：** 博客列表页会自动读取所有注册的文章并动态生成卡片，无需手动添加！

## 可用的 MDX 组件

### InfoBox

信息提示框，支持三种类型：

```mdx
<InfoBox type='info' title='标题'>
  内容
</InfoBox>

<InfoBox type='warning' title='警告'>
  警告内容
</InfoBox>

<InfoBox type='note' title='注意'>
  注意事项
</InfoBox>
```

### Section

内容分区：

```mdx
<Section title='章节标题'>章节内容</Section>
```

### AuthorInfo

作者信息：

```mdx
<AuthorInfo
  name='作者名称'
  avatar='/path/to/avatar.jpg' // 可选
  bio='作者简介'
  date='2024-10-14'
  readTime='8 min read'
/>
```

### Button

按钮组件：

```mdx
<Button>点击我</Button>
```

### LottieAnimation

Lottie 动画：

```mdx
import animationData from '@/assets/lottie/animation.json'

<LottieAnimation animationData={animationData} />
```

### BlogImage

博客文章配图：

```mdx
<BlogImage
  src='https://images.unsplash.com/photo-xxx?w=1200&q=80'
  alt='图片描述'
  caption='图片说明文字（可选）'
  width={1200}
  height={675}
/>
```

**Props:**

- `src`: 图片 URL（支持 Unsplash 图片）
- `alt`: 图片替代文本（必填，用于 SEO 和无障碍）
- `caption` (可选): 图片说明文字
- `width` (可选): 图片宽度，默认 1200
- `height` (可选): 图片高度，默认 675
- `priority` (可选): 是否优先加载，默认 false

## Markdown 语法支持

### 代码块

支持语法高亮：

\`\`\`typescript
const hello = 'world'
\`\`\`

### 表格

| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 值1 | 值2 | 值3 |

### 列表

- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2

### 链接

[链接文本](https://example.com)

### 图片

![Alt 文本](/path/to/image.jpg)

### 引用

> 这是一个引用

### 任务列表

- [ ] 待办事项
- [x] 已完成事项

## 文章访问路径

文章发布后可通过以下路径访问：

```
https://yourdomain.com/[locale]/blog/[slug]
```

例如：

- <https://yourdomain.com/en/blog/getting-started-with-workflow-automation>
- <https://yourdomain.com/zh/blog/building-scalable-microservices>

## 最佳实践

1. **文件命名**: 使用 kebab-case，只包含小写字母、数字和连字符
2. **Slug 一致性**: 文件名应该与文章 slug 保持一致
3. **元数据完整性**: 确保所有必需的 frontmatter 字段都填写完整
4. **图片优化**: 使用合适尺寸的图片，避免过大的文件
5. **内容结构**: 使用清晰的标题层级（H1 > H2 > H3）
6. **代码示例**: 为代码块指定语言以启用语法高亮
7. **相关文章**: 在文章末尾添加相关文章链接

## 示例文章模板

```mdx
---
title: '我的新文章标题'
description: '这是一篇关于某个主题的文章'
author: '张三'
authorBio: 'Telos 软件工程师'
date: '2024-10-14'
readTime: '5 min read'
tags: ['教程', '技术']
---

<AuthorInfo
  name='张三'
  bio='Telos 软件工程师'
  date='2024-10-14'
  readTime='5 min read'
/>

# 我的新文章标题

文章简介段落，简要说明这篇文章的主要内容。

<InfoBox type='info' title='重点内容'>
  - 要点 1 - 要点 2 - 要点 3
</InfoBox>

## 第一部分

第一部分的内容...

### 子章节

子章节内容...

\`\`\`typescript
// 代码示例
const example = 'Hello World'
\`\`\`

## 第二部分

第二部分的内容...

<InfoBox type='warning'>这里是一些重要的警告信息</InfoBox>

## 结论

总结性的段落...

---

### 相关文章

- [相关文章 1](/blog/related-article-1)
- [相关文章 2](/blog/related-article-2)
```
