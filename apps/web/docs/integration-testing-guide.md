# 集成测试指南

本文档说明 Google OAuth 集成的集成测试实现和最佳实践。

## 测试概述

集成测试验证不同组件之间的交互，确保整个认证流程的正确性。

### 测试范围

- 完整 Google OAuth 登录流程
- 多提供者登录兼容性
- 会话管理和持久化
- 后端 API 同步

## 测试文件结构

```
src/__tests__/integration/auth/
├── auth-integration.test.ts      # 主要认证集成测试
├── multi-provider.test.ts        # 多提供者兼容性测试
├── session-management.test.ts    # 会话管理测试
└── backend-sync.test.ts          # 后端同步测试
```

## 配置文件

### Jest 集成测试配置

```javascript
// jest.integration.config.mjs
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'Integration Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'],
  testTimeout: 30000,
  maxWorkers: 2,
}

export default createJestConfig(customJestConfig)
```

## 运行集成测试

```bash
# 运行所有集成测试
pnpm test:integration

# 运行特定集成测试文件
pnpm test:integration -- auth-integration.test.ts

# 运行集成测试并生成覆盖率报告
pnpm test:integration:coverage

# 监视模式运行集成测试
pnpm test:integration:watch
```

## 测试详细说明

### 1. 认证集成测试 (`auth-integration.test.ts`)

#### 完整 Google OAuth 登录流程

- ✅ 成功完成 Google 登录流程
- ✅ 处理 Google 登录失败
- ✅ 处理网络错误

#### 多提供者登录兼容性

- ✅ 同时显示 Google 和 GitHub 登录选项
- ✅ 在不同提供者之间切换
- ✅ 防止同时点击多个登录按钮

#### 会话管理和持久化

- ✅ 登录成功后重定向到指定页面
- ✅ 处理自定义回调 URL

#### 后端 API 同步

- ✅ 登录时同步用户信息到后端
- ✅ 处理后端同步失败但不阻止登录
- ✅ 重试失败的后端同步

#### 错误场景集成

- ✅ 显示认证错误页面
- ✅ 提供重试登录选项

#### 性能和用户体验

- ✅ 在合理时间内加载登录页面
- ✅ 正确处理快速连续点击
- ✅ 在登录过程中显示适当的加载状态

### 2. 多提供者兼容性测试 (`multi-provider.test.ts`)

#### 提供者配置兼容性

- ✅ 同时支持 Google 和 GitHub 提供者
- ✅ 处理只有一个提供者可用的情况
- ✅ 处理没有提供者可用的情况

#### 登录流程兼容性

- ✅ 使用 Google 提供者登录
- ✅ 使用 GitHub 提供者登录
- ✅ 一个提供者失败时允许尝试另一个

#### 会话状态兼容性

- ✅ 正确处理 Google 用户会话
- ✅ 正确处理 GitHub 用户会话
- ✅ 处理会话过期

#### 错误处理兼容性

- ✅ 为不同提供者显示相应的错误信息
- ✅ 提供返回登录页面的选项

#### 用户体验兼容性

- ✅ 在所有提供者按钮上保持一致的样式
- ✅ 在移动设备上正确显示多个提供者
- ✅ 支持键盘导航

#### 性能兼容性

- ✅ 并行加载多个提供者配置
- ✅ 缓存提供者配置

### 3. 会话管理测试 (`session-management.test.ts`)

#### 会话创建和初始化

- ✅ 登录后创建有效会话
- ✅ 处理会话加载状态
- ✅ 处理未认证状态

#### 会话持久化

- ✅ 页面刷新后保持会话
- ✅ 处理会话过期
- ✅ 自动刷新即将过期的会话

#### 会话更新

- ✅ 能够更新用户信息
- ✅ 处理会话更新失败

#### 会话终止

- ✅ 能够正常登出
- ✅ 处理登出失败
- ✅ 清理所有会话数据

#### 并发会话管理

- ✅ 处理多个标签页的会话同步
- ✅ 防止会话冲突

### 4. 后端同步测试 (`backend-sync.test.ts`)

#### 用户信息同步

- ✅ 登录时同步 Google 用户信息
- ✅ 登录时同步 GitHub 用户信息
- ✅ 处理后端同步失败但不阻止登录
- ✅ 重试失败的同步操作

#### 用户资料管理

- ✅ 能够获取用户资料
- ✅ 能够更新用户资料
- ✅ 处理资料更新失败

#### 登出同步

- ✅ 登出时调用后端 API
- ✅ 处理后端登出失败

#### API 错误处理

- ✅ 处理网络错误
- ✅ 处理 API 服务器错误
- ✅ 处理认证过期

## 最佳实践

### 1. 测试隔离

```javascript
beforeEach(() => {
  jest.clearAllMocks()
  // 重置测试状态
})

afterEach(() => {
  // 清理副作用
  if (global.fetch) {
    global.fetch.mockClear()
  }
})
```

### 2. 异步测试

```javascript
it('应该处理异步操作', async () => {
  const result = await asyncOperation()

  await waitFor(() => {
    expect(screen.getByTestId('result')).toBeInTheDocument()
  })
})
```

### 3. 用户交互模拟

```javascript
import userEvent from '@testing-library/user-event'

it('应该处理用户点击', async () => {
  const button = screen.getByRole('button')
  await userEvent.click(button)

  await waitFor(() => {
    expect(mockFunction).toHaveBeenCalled()
  })
})
```

### 4. 错误场景测试

```javascript
it('应该处理错误', async () => {
  mockFunction.mockRejectedValue(new Error('Test error'))

  // 触发错误
  await userEvent.click(button)

  await waitFor(() => {
    expect(screen.getByTestId('error')).toHaveTextContent('Test error')
  })
})
```

## 故障排除

### 常见问题

1. **测试超时**
   - 增加 `testTimeout` 配置
   - 使用 `waitFor` 等待异步操作

2. **模块解析错误**
   - 检查 `moduleNameMapping` 配置
   - 确保模拟文件路径正确

3. **组件渲染错误**
   - 检查必要的 Provider 包装
   - 确保所有依赖都已模拟

4. **异步操作未完成**
   - 使用 `act` 包装状态更新
   - 等待所有 Promise 完成

### 调试技巧

```javascript
// 调试渲染结果
screen.debug()

// 查看所有查询
screen.logTestingPlaygroundURL()

// 添加调试信息
console.log('Current state:', getCurrentState())
```

## 总结

我们已经为 Google OAuth 集成实现了全面的集成测试覆盖，包括：

- **4 个主要测试文件**，覆盖所有集成场景
- **完整的认证流程测试**
- **多提供者兼容性验证**
- **会话管理和持久化测试**
- **后端 API 同步测试**

这些集成测试确保了整个认证系统的可靠性和用户体验的一致性。
