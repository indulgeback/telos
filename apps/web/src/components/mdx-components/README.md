# MDX Components Documentation

这个目录包含了用于 MDX 页面的自定义组件。所有组件都已在 `index.tsx` 中导出，可以直接在 `.mdx` 文件中使用。

## 可用组件

### 1. Section

用于组织内容的分区组件。

```mdx
<Section title='章节标题'>这里是章节内容</Section>
```

**Props:**

- `title` (可选): 章节标题
- `children`: 章节内容
- `className` (可选): 自定义 CSS 类

### 2. InfoBox

信息提示框组件，支持不同类型的提示。

```mdx
<InfoBox type='info' title='提示'>
  这是一个信息提示框
</InfoBox>

<InfoBox type='warning' title='警告'>
  这是一个警告提示框
</InfoBox>

<InfoBox type='note' title='注意'>
  这是一个注意事项提示框
</InfoBox>
```

**Props:**

- `type` (可选): `'info' | 'warning' | 'note'`，默认 `'info'`
- `title` (可选): 提示框标题
- `children`: 提示框内容

### 3. LastUpdated

显示最后更新日期的组件。

```mdx
<LastUpdated date='2024-10-14' />
```

**Props:**

- `date`: 日期字符串（ISO 格式或任何 JavaScript Date 可解析的格式）

### 4. BlogCard

博客卡片组件，用于显示博客文章列表。

```mdx
<BlogCard
  title='文章标题'
  excerpt='文章摘要'
  date='2024-10-14'
  readTime='8 min read'
  slug='article-slug'
  tags={['Tag1', 'Tag2']}
/>
```

**Props:**

- `title`: 文章标题
- `excerpt`: 文章摘要
- `date`: 发布日期
- `readTime`: 阅读时间
- `slug`: 文章路径（用于链接）
- `tags` (可选): 标签数组

### 5. AuthorInfo

作者信息组件，用于显示文章作者信息。

```mdx
<AuthorInfo
  name='作者名称'
  avatar='/path/to/avatar.jpg'
  bio='作者简介'
  date='2024-10-14'
  readTime='8 min read'
/>
```

**Props:**

- `name`: 作者名称
- `avatar` (可选): 头像 URL
- `bio` (可选): 作者简介
- `date` (可选): 发布日期
- `readTime` (可选): 阅读时间

## 已创建的页面

### 1. Terms of Service

路径: `/[locale]/terms-of-service`

完整的服务条款页面，包含：

- 条款接受
- 用户责任
- 知识产权
- 服务修改和终止
- 免责声明
- 争议解决
  等章节

### 2. Privacy Policy

路径: `/[locale]/privacy-policy`

完整的隐私政策页面，包含：

- 信息收集
- 信息使用
- 数据共享
- Cookie 政策
- 数据安全
- 用户权利
  等章节

### 3. Blog

路径: `/[locale]/blog`

博客列表页，展示所有博客文章卡片。

### 4. Blog 详情页

路径: `/[locale]/blog/[slug]`

示例博客文章，展示如何使用各种 MDX 组件。

## 样式

所有组件的样式都定义在 `/apps/web/src/styles/mdx-prose.css` 中，包括：

- 基础样式
- 暗色模式支持
- 响应式设计

## 使用示例

在任何 `.mdx` 文件中，您可以直接使用这些组件：

```mdx
export const metadata = {
  title: '我的页面',
  description: '页面描述',
}

<LastUpdated date='2024-10-14' />

# 页面标题

<InfoBox type='info' title='重要提示'>
  这是一个重要的信息提示。
</InfoBox>

## 章节 1

内容...

<Section title='特殊章节'>这里是特殊章节的内容</Section>
```

## 注意事项

1. 所有组件都支持暗色模式
2. 组件具有响应式设计，适配移动端
3. 使用 Next.js Image 组件优化图片加载
4. 所有外部链接会自动在新标签页打开（BlogCard）
