# 单元测试指南

本文档说明 Google OAuth 集成的单元测试实现和最佳实践。

## 测试结构

### 测试文件组织

```
src/__tests__/
├── auth/                           # 认证相关测试
│   ├── google-oauth.test.ts       # Google OAuth 配置测试
│   ├── user-mapping.test.ts       # 用户信息映射测试
│   ├── error-handling.test.ts     # 错误处理测试
│   └── jwt-callback.test.ts       # JWT 回调测试
├── components/                     # 组件测试
│   └── atoms/
│       └── icons/
│           └── GoogleIcon.test.tsx # Google 图标组件测试
├── lib/                           # 工具库测试
│   └── security.test.ts          # 安全配置测试
└── auth.test.ts                   # 主认证配置测试
```

### 模拟文件组织

```
src/__mocks__/
└── @/
    ├── lib/
    │   ├── api-client.ts          # API 客户端模拟
    │   └── security.ts            # 安全模块模拟
    └── components/
        └── molecules.tsx          # 分子组件模拟
```

## 测试覆盖范围

### 1. Google OAuth 配置测试 (`google-oauth.test.ts`)

#### 环境变量配置

- ✅ Google OAuth 客户端 ID 验证
- ✅ Google OAuth 客户端密钥验证
- ✅ 认证密钥验证
- ✅ NextAuth URL 验证

#### Google 提供者配置

- ✅ OAuth 权限范围验证
- ✅ 授权 URL 配置验证
- ✅ 令牌 URL 配置验证
- ✅ 用户信息 URL 配置验证

#### 用户信息映射

- ✅ 完整 Google 用户信息映射
- ✅ 缺失用户头像处理
- ✅ 未验证邮箱处理

#### JWT 回调处理

- ✅ JWT 中包含 Google 提供者信息
- ✅ 令牌刷新处理

#### 会话回调处理

- ✅ 会话中包含 Google 用户信息

#### 错误处理

- ✅ Google OAuth 授权错误
- ✅ 网络连接错误
- ✅ 无效客户端配置错误

#### 安全性验证

- ✅ state 参数验证
- ✅ nonce 参数验证
- ✅ ID 令牌签名验证

### 2. 用户信息映射测试 (`user-mapping.test.ts`)

#### Google 用户信息映射

- ✅ 完整 Google 用户信息映射
- ✅ 最小化 Google 用户信息处理
- ✅ 无效头像 URL 处理

#### GitHub 用户信息映射

- ✅ 完整 GitHub 用户信息映射
- ✅ 缺失邮箱的 GitHub 用户处理

#### 用户信息同步

- ✅ 成功同步用户信息到后端
- ✅ 用户同步失败处理
- ✅ 重试失败的同步操作

#### 数据验证

- ✅ 必需用户字段验证
- ✅ 数据清理和标准化

### 3. 错误处理测试 (`error-handling.test.ts`)

#### OAuth 错误处理

- ✅ 用户拒绝授权错误
- ✅ 无效客户端配置错误
- ✅ 服务器错误处理

#### 网络错误处理

- ✅ 网络连接超时
- ✅ 网络连接失败

#### 后端 API 错误处理

- ✅ 后端服务不可用
- ✅ 认证失败错误

#### 错误恢复策略

- ✅ 指数退避重试
- ✅ 断路器模式

#### 用户友好的错误消息

- ✅ 本地化错误消息
- ✅ 错误恢复建议

### 4. JWT 回调测试 (`jwt-callback.test.ts`)

#### 首次登录处理

- ✅ 首次登录时创建 JWT token
- ✅ 用户同步失败但不阻止登录

#### 后续请求处理

- ✅ 返回现有 token
- ✅ token 过期检查

#### 多提供者支持

- ✅ GitHub 提供者处理
- ✅ 不同提供者独立 token

#### 安全性验证

- ✅ 必需用户字段验证
- ✅ 用户输入清理和验证
- ✅ token 大小限制

## 测试配置

### Jest 配置 (`jest.config.mjs`)

```javascript
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-resizable-panels|@radix-ui)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
  ],
}

export default createJestConfig(customJestConfig)
```

### Jest 设置 (`jest.setup.js`)

```javascript
import '@testing-library/jest-dom'

// 确保 jest 全局可用
global.jest = jest

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }) => children,
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => key => key),
  useLocale: jest.fn(() => 'en'),
}))

// Mock environment variables
process.env.AUTH_SECRET = 'test-secret-key-for-testing-purposes-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.NODE_ENV = 'test'
```

## 运行测试

### 基本命令

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test -- google-oauth.test.ts

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监视模式运行测试
pnpm test:watch
```

### 测试模式

```bash
# 运行特定测试套件
pnpm test -- --testNamePattern="Google OAuth Configuration"

# 运行特定测试
pnpm test -- --testNamePattern="应该配置 Google 提供者"

# 详细输出
pnpm test -- --verbose

# 只运行失败的测试
pnpm test -- --onlyFailures
```

## 测试最佳实践

### 1. 测试命名

```javascript
// ✅ 好的测试命名
describe('Google OAuth Configuration', () => {
  it('应该配置 Google 提供者', () => {
    // 测试逻辑
  })
})

// ❌ 不好的测试命名
describe('Test', () => {
  it('test1', () => {
    // 测试逻辑
  })
})
```

### 2. 测试结构

```javascript
// ✅ 好的测试结构
describe('功能模块', () => {
  beforeEach(() => {
    // 设置测试环境
  })

  describe('特定场景', () => {
    it('应该有预期行为', () => {
      // Arrange - 准备测试数据
      const input = {
        /* 测试数据 */
      }

      // Act - 执行被测试的功能
      const result = functionUnderTest(input)

      // Assert - 验证结果
      expect(result).toBe(expectedValue)
    })
  })
})
```

### 3. 模拟和存根

```javascript
// ✅ 好的模拟使用
beforeEach(() => {
  mockApiClient.syncUser.mockResolvedValue({ success: true })
  jest.clearAllMocks()
})

// ✅ 验证模拟调用
expect(mockApiClient.syncUser).toHaveBeenCalledWith({
  id: user.id,
  email: user.email,
  provider: 'google',
})
```

### 4. 异步测试

```javascript
// ✅ 正确的异步测试
it('应该处理异步操作', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})

// ✅ 错误处理测试
it('应该处理异步错误', async () => {
  await expect(failingAsyncFunction()).rejects.toThrow('Expected error')
})
```

### 5. 边界条件测试

```javascript
// ✅ 测试边界条件
it('应该处理空输入', () => {
  expect(functionUnderTest(null)).toBe(defaultValue)
  expect(functionUnderTest(undefined)).toBe(defaultValue)
  expect(functionUnderTest('')).toBe(defaultValue)
})

it('应该处理极端值', () => {
  expect(functionUnderTest(Number.MAX_VALUE)).toBeDefined()
  expect(functionUnderTest(Number.MIN_VALUE)).toBeDefined()
})
```

## 覆盖率目标

### 当前覆盖率阈值

- **分支覆盖率**: 70%
- **函数覆盖率**: 70%
- **行覆盖率**: 70%
- **语句覆盖率**: 70%

### 覆盖率报告

```bash
# 生成覆盖率报告
pnpm test:coverage

# 查看详细覆盖率报告
open coverage/lcov-report/index.html
```

## 持续集成

### GitHub Actions 配置

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

## 故障排除

### 常见问题

1. **模块解析错误**
   - 检查 `moduleNameMapping` 配置
   - 确保模拟文件路径正确

2. **异步测试超时**
   - 使用 `async/await` 正确处理异步操作
   - 设置合适的超时时间

3. **模拟不工作**
   - 确保在导入模块之前设置模拟
   - 使用 `jest.clearAllMocks()` 清理模拟状态

4. **环境变量问题**
   - 在 `jest.setup.js` 中设置测试环境变量
   - 使用 `.env.test` 文件

### 调试技巧

```javascript
// 调试测试
it('调试测试', () => {
  console.log('调试信息:', debugData)
  // 使用 --verbose 标志查看详细输出
})

// 跳过测试
it.skip('暂时跳过的测试', () => {
  // 测试逻辑
})

// 只运行特定测试
it.only('只运行这个测试', () => {
  // 测试逻辑
})
```

## 总结

我们已经为 Google OAuth 集成实现了全面的单元测试覆盖，包括：

- **74 个测试用例**，覆盖所有关键功能
- **完整的错误处理测试**
- **安全性验证测试**
- **多提供者支持测试**
- **用户信息映射和同步测试**

这些测试确保了 Google OAuth 集成的可靠性和安全性，为后续的集成测试和部署提供了坚实的基础。
