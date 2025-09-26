# Telos Design System - Storybook 组织规范

## 📁 文件夹结构

```
src/stories/Telos/
├── README.md                    # 本文档
├── Atoms/                       # 原子组件
│   ├── button.stories.tsx
│   ├── input.stories.tsx
│   ├── card.stories.tsx
│   ├── avatar.stories.tsx
│   ├── badge.stories.tsx
│   ├── label.stories.tsx
│   ├── checkbox.stories.tsx
│   ├── switch.stories.tsx
│   ├── radio-group.stories.tsx
│   ├── textarea.stories.tsx
│   ├── skeleton.stories.tsx
│   ├── progress.stories.tsx
│   └── separator.stories.tsx
├── Molecules/                   # 分子组件 (待创建)
├── Organisms/                   # 有机体组件 (待创建)
├── Templates/                   # 模板组件 (待创建)
└── Pages/                       # 页面组件 (待创建)
```

## 🏷️ 分组命名规范

### 主要分组层级

1. **Telos** - 主品牌分组，包含所有 Telos 设计系统组件
2. **组件层级** - 基于原子设计理论的分层
3. **组件名称** - 具体的组件名称

### 完整标题格式

```typescript
const meta = {
  title: 'Telos/[层级]/[组件名称]',
  // 例如：
  // 'Telos/Atoms/Button'
  // 'Telos/Molecules/SearchBar'
  // 'Telos/Organisms/Header'
}
```

## 📦 组件层级定义

### Atoms (原子组件)

最基础的UI构建块，不能进一步分解的组件。

**特征：**

- 单一功能
- 无业务逻辑
- 高度可复用
- 独立存在

**示例：**

- Button - 按钮
- Input - 输入框
- Label - 标签
- Badge - 徽章
- Avatar - 头像
- Card - 卡片

### Molecules (分子组件)

由原子组件组合而成的功能组件。

**特征：**

- 组合多个原子组件
- 具有特定功能
- 相对简单的交互逻辑

**示例：**

- SearchBar (Input + Button)
- UserCard (Avatar + Label + Button)
- FormField (Label + Input + ErrorMessage)

### Organisms (有机体组件)

复杂的UI部分，由原子和分子组件组成。

**特征：**

- 复杂的组件组合
- 包含业务逻辑
- 形成界面的独立区域

**示例：**

- Header (Logo + Navigation + UserMenu)
- ProductList (SearchBar + ProductCard[])
- ContactForm (FormField[] + SubmitButton)

### Templates (模板组件)

定义页面的骨架结构，不包含具体内容。

**特征：**

- 页面布局结构
- 组件占位符
- 响应式设计

**示例：**

- DashboardTemplate
- ArticleTemplate
- ProfileTemplate

### Pages (页面组件)

完整的页面实例，包含真实数据。

**特征：**

- 完整的用户界面
- 真实数据展示
- 完整的用户流程

**示例：**

- LoginPage
- DashboardPage
- ProductDetailPage

## 📝 Story 文件命名规范

### 文件命名

- 使用 PascalCase
- 以 `.stories.tsx` 结尾
- 与组件名称保持一致

```
button.stories.tsx     ✅ 正确
Button.stories.tsx     ✅ 也可以
buttonStories.tsx      ❌ 错误
button.story.tsx       ❌ 错误
```

### Story 导出命名

- 使用 PascalCase
- 描述性的名称
- 避免使用 `Story` 后缀

```typescript
// ✅ 正确
export const Default: Story = { ... }
export const WithIcon: Story = { ... }
export const Loading: Story = { ... }

// ❌ 错误
export const defaultStory: Story = { ... }
export const WithIconStory: Story = { ... }
```

## 🎯 创建新分组的步骤

### 1. 创建文件夹结构

```bash
mkdir -p src/stories/Telos/[新分组名]
```

### 2. 创建组件 Story

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { YourComponent } from '@/components/[层级]/your-component'

const meta = {
  title: 'Telos/[层级]/[组件名]',
  component: YourComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '组件描述...',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // 默认参数
  },
}
```

### 3. 更新此文档

在相应的分组部分添加新组件的说明。

## 🔧 导入路径规范

### 组件导入

使用绝对路径，通过 `@/` 别名：

```typescript
// ✅ 正确
import { Button } from '@/components/atoms/button'
import { SearchBar } from '@/components/molecules/search-bar'

// ❌ 错误
import { Button } from './button'
import { Button } from '../../../components/atoms/button'
```

### 工具库导入

```typescript
// 图标库
import { Search, Mail, Settings } from 'lucide-react'

// React Hooks
import { useState, useEffect } from 'react'

// Storybook 类型
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
```

## 📋 Story 内容规范

### 必需的 Story

每个组件至少应包含：

1. **Default** - 默认状态
2. **所有变体** - 如果组件有 variant 属性
3. **所有尺寸** - 如果组件有 size 属性
4. **状态展示** - disabled, loading, error 等
5. **使用示例** - 实际应用场景

### 可选的 Story

根据组件复杂度添加：

- **交互示例** - 展示用户交互
- **组合展示** - 与其他组件的组合
- **边界情况** - 极长文本、空状态等
- **主题变体** - 深色模式、品牌主题等

## 🎨 最佳实践

### 1. 组件描述

为每个组件提供清晰的描述：

```typescript
docs: {
  description: {
    component: '简洁明确地描述组件的用途和特点。包含使用场景和注意事项。',
  },
},
```

### 2. 参数控制

为重要的 props 提供控制器：

```typescript
argTypes: {
  variant: {
    control: 'select',
    options: ['default', 'primary', 'secondary'],
  },
  size: {
    control: 'select',
    options: ['sm', 'md', 'lg'],
  },
  disabled: {
    control: 'boolean',
  },
},
```

### 3. 布局设置

根据组件特点选择合适的布局：

```typescript
parameters: {
  layout: 'centered', // 或 'fullscreen', 'padded'
},
```

### 4. 标签使用

使用标签来增强文档：

```typescript
tags: ['autodocs'], // 自动生成文档
```

## 🚀 未来扩展

### 计划中的分组

- **Telos/Tokens** - 设计令牌展示
- **Telos/Patterns** - 设计模式
- **Telos/Layouts** - 布局组件
- **Telos/Charts** - 图表组件
- **Telos/Forms** - 表单组件

### 子分组示例

如果某个分组变得过大，可以创建子分组：

```
Telos/Atoms/Form/
├── input.stories.tsx
├── textarea.stories.tsx
├── select.stories.tsx
└── checkbox.stories.tsx

# 对应的 title 为：
# 'Telos/Atoms/Form/Input'
# 'Telos/Atoms/Form/Textarea'
```

---

## 📞 维护联系

如有疑问或建议，请联系：

- 前端架构团队
- 设计系统维护者
- 通过 GitHub Issues 提交建议

---

_最后更新：2024年12月_
