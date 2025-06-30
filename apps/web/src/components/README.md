# 组件架构 - 原子设计模式

本项目的组件按照原子设计模式进行组织，分为四个层级：

## 📁 目录结构

```plaintext
components/
├── atoms/          # 原子组件 (包含 shadcn 组件)
├── molecules/      # 分子组件
├── organisms/      # 组织组件
├── provider/       # Provider 组件
├── index.ts        # 统一导出
└── README.md
```

## 🧪 原子组件 (Atoms)

原子组件是最小的、不可再分的UI组件。它们构成了整个设计系统的基础。

**特点：**

- 最小的功能单元
- 高度可复用
- 不依赖其他组件
- 通常对应HTML原生元素

**当前组件：**

- `Button` - 按钮组件
- `Badge` - 徽章组件

**shadcn 组件：**
所有通过 `pnpm dlx shadcn@latest add` 安装的组件都会自动安装到 `atoms/` 目录中。

**使用示例：**

```tsx
import { Button, Badge } from '@/components'
```

## 🧬 分子组件 (Molecules)

分子组件是由原子组件组合而成的简单组件。

**特点：**

- 由多个原子组件组成
- 具有特定的功能
- 相对独立
- 可复用

**示例：**

- 搜索框（输入框 + 按钮）
- 导航项（链接 + 图标）
- 表单字段（标签 + 输入框 + 错误信息）

## 🦠 组织组件 (Organisms)

组织组件是由分子组件组合而成的复杂组件。

**特点：**

- 由多个分子组件组成
- 形成页面的主要部分
- 具有完整的业务功能
- 相对复杂

**示例：**

- 页面头部（导航 + 搜索 + 用户菜单）
- 产品卡片（图片 + 标题 + 价格 + 按钮）
- 表单（多个表单字段 + 提交按钮）

## 🔧 Provider 组件

Provider 组件用于提供全局状态、主题、国际化等上下文。

**特点：**

- 提供全局上下文
- 通常包装在应用的最外层
- 管理全局状态和配置
- 支持跨组件数据共享

**当前组件：**

- `ThemeProvider` - 主题提供者

**使用示例：**

```tsx
import { ThemeProvider } from '@/components'
```

## 📦 导入方式

### 统一导入（推荐）

```tsx
import { Button, Badge, ThemeProvider } from '@/components'
```

### 按层级导入

```tsx
import { Button } from '@/components/atoms/button'
import { SearchBox } from '@/components/molecules/search-box'
import { Header } from '@/components/organisms/header'
import { ThemeProvider } from '@/components/provider/theme-provider'
```

### shadcn 组件导入

```tsx
// 通过 @/components/ui 别名导入（推荐）
import { Button } from '@/components/ui/button'

// 或通过统一导出导入
import { Button } from '@/components'
```

## 🎯 最佳实践

1. **原子组件**：保持简单，只负责样式和基本交互
2. **分子组件**：组合原子组件，添加简单逻辑
3. **组织组件**：处理复杂业务逻辑，组合多个分子组件
4. **Provider 组件**：管理全局状态，提供上下文
5. **命名规范**：使用 kebab-case 命名文件，PascalCase 命名组件
6. **类型安全**：为所有组件提供完整的 TypeScript 类型定义
7. **shadcn 组件**：使用 `npx shadcn@latest add <component>` 安装到 atoms 目录
