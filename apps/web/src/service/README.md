# 服务层架构说明

## 目录结构

```plaintext
src/service/
├── request.ts      # 通用请求服务
├── auth.ts         # 认证服务
├── user.ts         # 用户服务
├── index.ts        # 统一导出
└── README.md       # 使用说明
```

## 设计原则

参考 Dify 的接口组织方式，采用以下设计原则：

1. **职责分离**: 每个服务只负责特定领域的业务逻辑
2. **类型安全**: 完整的 TypeScript 类型定义
3. **错误处理**: 统一的错误处理机制
4. **可扩展性**: 易于添加新的服务和接口

## 使用方式

### 1. 导入服务

```typescript
import { AuthService, UserService, requestService } from '@/service'
```

### 2. 认证服务使用

```typescript
// 用户登录
const response = await AuthService.signIn({
  id: 'user123',
  email: 'user@example.com',
  name: 'User Name',
  provider: 'github',
})

// 获取当前用户
const user = await AuthService.getCurrentUser()

// 同步用户信息
await AuthService.syncUser(userData)
```

### 3. 用户服务使用

```typescript
// 获取用户列表
const users = await UserService.getUsers({
  page: 1,
  pageSize: 10,
  search: 'john',
})

// 更新用户信息
await UserService.updateUser('user123', {
  name: 'New Name',
  avatar: 'new-avatar.jpg',
})

// 获取用户统计
const stats = await UserService.getUserStats()
```

### 4. 直接使用请求服务

```typescript
// GET 请求
const data = await requestService.get('/api/custom-endpoint')

// POST 请求
const result = await requestService.post('/api/custom-endpoint', {
  key: 'value',
})

// 带自定义配置的请求
const response = await requestService.request('/api/custom-endpoint', {
  method: 'PUT',
  headers: { 'Custom-Header': 'value' },
  timeout: 5000,
})
```

## 错误处理

所有服务都使用统一的错误处理机制：

```typescript
try {
  const response = await AuthService.signIn(userData)
  // 处理成功响应
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API错误: ${error.message}`, error.status)
  } else {
    console.error('未知错误:', error)
  }
}
```

## 类型定义

所有接口都有完整的 TypeScript 类型定义：

```typescript
// 响应类型
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 用户类型
interface BackendUser {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

## 扩展新服务

要添加新的服务，按照以下步骤：

1. 在 `service/` 目录下创建新的服务文件
2. 定义相关的类型接口
3. 实现服务类和方法
4. 在 `index.ts` 中导出新服务

示例：

```typescript
// service/workflow.ts
import { requestService, ApiResponse } from './request'

export interface Workflow {
  id: string
  name: string
  // ... 其他字段
}

export class WorkflowService {
  static async getWorkflows(): Promise<ApiResponse<Workflow[]>> {
    return requestService.get('/api/workflows')
  }
}
```
