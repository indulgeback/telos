# Storybook 设置文档

## 📦 安装的包

### 核心包

- `@storybook/nextjs-vite` - Next.js + Vite 框架适配器
- `@chromatic-com/storybook` - Chromatic 插件
- `@storybook/blocks` - 文档块组件

### 插件

- `@storybook/addon-docs` - 自动文档生成
- `@storybook/addon-onboarding` - 入门指南
- `@storybook/addon-a11y` - 无障碍性测试
- `@storybook/addon-vitest` - Vitest 集成
- `@storybook/test` - 交互测试工具

## 🔧 配置文件

### `.storybook/main.ts`

主配置文件，包含：

- Stories 文件路径配置
- 插件配置
- Vite 配置 (包括路径别名)
- TypeScript 配置

### `.storybook/preview.ts`

预览配置，包含：

- 全局样式导入
- 参数配置
- 背景主题
- 文档设置
- 无障碍性配置

## 📁 文件结构

```
src/stories/
├── Introduction.mdx          # 主页介绍文档
└── Telos/                   # Telos 设计系统分组
    ├── README.md            # 组织规范文档
    └── Atoms/               # 原子组件
        ├── button.stories.tsx
        ├── input.stories.tsx
        ├── card.stories.tsx
        ├── avatar.stories.tsx
        ├── badge.stories.tsx
        ├── label.stories.tsx
        ├── checkbox.stories.tsx
        ├── progress.stories.tsx
        └── ...
```

## 🚀 使用命令

### 开发模式

```bash
pnpm storybook
```

### 构建 Storybook

```bash
pnpm build-storybook
```

## 🎯 核心特性

### 1. 路径别名支持

通过 Vite 配置支持 `@/` 别名：

```typescript
'@': path.resolve(__dirname, '../src')
```

### 2. 自动文档生成

使用 `autodocs` 标签自动生成组件文档：

```typescript
tags: ['autodocs']
```

### 3. TypeScript 支持

完整的 TypeScript 类型检查和自动补全。

### 4. 无障碍性测试

内置 a11y 插件，自动检查组件的无障碍性。

### 5. 主题支持

配置了浅色、深色和灰色背景主题。

### 6. 交互测试

支持用户交互行为测试。

## 🏗️ 组件 Story 规范

### 基础结构

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Component } from '@/components/atoms/component'

const meta = {
  title: 'Telos/Atoms/Component',
  component: Component,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '组件描述...',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Component>

export default meta
type Story = StoryObj<typeof meta>
```

### 必需的 Stories

- `Default` - 默认状态
- 所有变体 (如果有 variant 属性)
- 所有尺寸 (如果有 size 属性)
- 状态展示 (disabled, loading, error 等)

## 🔍 调试和故障排除

### 常见问题

1. **路径别名不工作**
   - 检查 `.storybook/main.ts` 中的 `viteFinal` 配置
   - 确保路径别名与项目配置一致

2. **样式不显示**
   - 检查 `.storybook/preview.ts` 中的 CSS 导入
   - 确保 Tailwind CSS 正确配置

3. **组件导入错误**
   - 使用绝对路径 `@/components/...`
   - 检查组件导出是否正确

4. **TypeScript 错误**
   - 使用正确的类型导入：`import type { Meta, StoryObj } from '@storybook/nextjs-vite'`
   - 避免直接从 `@storybook/react` 导入

## 📊 性能优化

### 1. Story 文件优化

- 避免在 stories 中进行重度计算
- 使用 `render` 函数而不是复杂的组件

### 2. 图片优化

- 使用适当尺寸的图片
- 考虑使用 placeholder 或 lazy loading

### 3. 依赖优化

- 避免导入不必要的大型库
- 使用 tree-shaking 友好的导入方式

## 🔮 未来计划

### 即将添加的功能

- 更多原子组件 Stories
- 分子组件 Stories
- 有机体组件 Stories
- 设计令牌展示
- 交互测试套件

### 改进项目

- 性能监控
- 视觉回归测试
- 自动化截图
- CI/CD 集成

## 📞 获取帮助

### 问题和建议

- 查看 Storybook 官方文档
- 检查项目的 GitHub Issues
- 联系前端团队

### 有用链接

- [Storybook 官方文档](https://storybook.js.org/)
- [Next.js + Storybook 指南](https://storybook.js.org/docs/get-started/nextjs)
- [Vite + Storybook 配置](https://storybook.js.org/docs/builders/vite)

---

_最后更新：2024年12月_
_维护者：Telos 前端团队_
