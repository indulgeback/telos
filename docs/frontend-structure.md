# 前端（`apps/web`）项目结构说明

本文档概述 `apps/web` 的目录组织、关键文件、开发流程与代码约定，帮助新成员快速上手前端代码库。

## 一、项目概览

- 位置：`apps/web`（Next.js 15 + TypeScript）
- 主要职责：提供 Web 管理后台、工作流可视化与用户交互界面
- 技术栈：Next.js（App Router）、React、TypeScript、Tailwind CSS、Shadcn UI、React Flow、Zustand、next-intl

## 二、主要目录（高阶视图）

- [apps/web](apps/web)
  - `src/`：应用源码
    - `app/`：App Router 路由与页面（server / client components）
    - `components/`：可复用组件（遵循原子化目录）
    - `lib/`：工具函数、API clients、格式化 helpers
    - `hooks/`：自定义 React hooks
    - `services/`：封装后端请求（tRPC / REST 客户端）
    - `store/`：全局状态（`Zustand`）
    - `styles/`：Tailwind 配置与全局样式
    - `src/lang/`：国际化资源（基线语言：`zh.json`）
  - `public/`：静态资源（图片、favicon 等）
  - `components.json`、`next.config.ts`、`tsconfig.json`：配置文件

## 三、关键文件说明

- 路由入口：`src/app/` —— 基于 App Router，页面按文件夹组织，支持服务器组件与客户端组件。
- 国际化基准：`src/lang/zh.json` —— 新增翻译必须先补充到这里。
- 样式：`tailwind.config.js`（repo 根或 `apps/web` 下）——Tailwind 配置、设计系统变量。
- API 客户端：`src/services/*` —— 集中管理后端调用（建议使用统一错误/鉴权处理）。
- 状态管理：`src/store/*` —— 使用 `Zustand` 管理全局状态（用户、session、UI 状态）。

## 四、代码约定与最佳实践

- 组件命名：PascalCase，文件名 kebab-case（例如 `UserAvatar` -> `user-avatar.tsx`）。
- 目录风格：遵循原子化设计（`atoms/`、`molecules/`、`organisms/`）。
- 类型：启用 `strict`，为组件 props 显式定义 `interface` 或 `type`。
- 表单：使用 `react-hook-form` + `zod` 做验证与类型推断。
- 国际化：通过 `useTranslations('PageName')` 使用翻译。示例：`const t = useTranslations('MyPage')`。

## 五、开发 / 构建 / 测试 命令

- 开发（本地热重载）：
  ```bash
  pnpm web:dev
  ```
- 生产构建：
  ```bash
  pnpm --filter ./apps/web build
  ```
- 测试（Vitest）：
  ```bash
  pnpm --filter ./apps/web test
  ```
- 格式化与 Lint：
  ```bash
  pnpm --filter ./apps/web format
  pnpm --filter ./apps/web lint
  ```

## 六、数据获取与 API 策略

- 优先使用服务封装层 `src/services` 统一处理鉴权、重试、错误上报。
- 页面/服务器组件：尽量在 Server Components 中做初始数据请求以利用 SSR（若需客户端交互再使用 React Query）。
- 缓存策略：静态资源使用 `revalidate` 或 SWR/React Query 的缓存策略。

## 七、测试与质量保障

- 单元/集成测试：Vitest + Testing Library。
- 在提交前运行 `pnpm --filter ./apps/web format` 与 `pnpm --filter ./apps/web lint`。

## 八、常见改进点（建议）

- 将 API 合约导出为 OpenAPI 或 tRPC 类型，减少前后端契约错误。
- 增加 CI 流水线：自动运行 `pnpm web:dev`（lint/test/build）与 Pull Request 检查。
- 增强本地调试：提供 `docker-compose` 或 `pnpm` 脚本一键启动后端依赖（DB/Redis/Registry）。

---

文档路径：`docs/frontend-structure.md` — 若要纳入 README 或在项目首页引用，我可以继续提交更新并在 README 中链接此文档。

如果你希望，我可以：

- 1. 将此文档细化为「页面路由清单」或「组件索引」；
- 2. 为 `src/services` 提供示例模板（请求封装 + 鉴权中间件）。

---

更新时间：2026-01-27
