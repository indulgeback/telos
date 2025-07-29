# 认证服务 API 文档

## 概述

认证服务提供用户登录、登出和信息同步功能，支持 OAuth 登录和 JWT 认证。

## 基础信息

- **服务名称**: auth-service
- **基础 URL**: `http://localhost:8080/api/v1`
- **认证方式**: JWT Bearer Token

## API 接口

### 1. 用户登录

**接口**: `POST /auth/signin`

**描述**: 用户登录接口，支持 OAuth 登录，会自动创建或更新用户信息

**请求体**:

```json
{
  "id": "github_user_123",
  "email": "user@example.com",
  "name": "张三",
  "image": "https://avatar.url",
  "provider": "github",
  "accessToken": "oauth_access_token"
}
```

**请求参数**:

- `id` (string, required): 用户唯一标识
- `email` (string, required): 用户邮箱
- `name` (string, required): 用户姓名
- `image` (string, optional): 用户头像 URL
- `provider` (string, required): 登录提供商 (github, google, local 等)
- `accessToken` (string, optional): OAuth 访问令牌

**响应示例**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "github_user_123",
      "email": "user@example.com",
      "name": "张三",
      "image": "https://avatar.url",
      "provider": "github",
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  },
  "message": "登录成功"
}
```

### 2. 用户登出

**接口**: `POST /auth/signout`

**描述**: 用户登出接口，需要 JWT 认证

**请求头**:

```
Authorization: Bearer <jwt_token>
```

**响应示例**:

```json
{
  "success": true,
  "message": "登出成功"
}
```

### 3. 同步用户信息

**接口**: `POST /auth/sync`

**描述**: 同步用户信息接口，从 JWT token 中获取最新信息并更新到数据库

**请求头**:

```
Authorization: Bearer <jwt_token>
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "github_user_123",
      "email": "user@example.com",
      "name": "张三",
      "image": "https://avatar.url",
      "provider": "github",
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "synced": true
  },
  "message": "用户信息同步成功"
}
```

### 4. 获取用户资料

**接口**: `GET /auth/profile`

**描述**: 获取当前用户的详细资料

**请求头**:

```
Authorization: Bearer <jwt_token>
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "github_user_123",
      "email": "user@example.com",
      "name": "张三",
      "image": "https://avatar.url",
      "provider": "github",
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  },
  "message": "获取用户资料成功"
}
```

### 5. 刷新令牌

**接口**: `POST /auth/refresh`

**描述**: 刷新 JWT 访问令牌

**请求头**:

```
Authorization: Bearer <jwt_token>
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "github_user_123",
      "email": "user@example.com",
      "name": "张三",
      "image": "https://avatar.url"
    },
    "token": "new_jwt_token_here",
    "refreshToken": "new_refresh_token_here",
    "expiresAt": "2024-01-16T10:30:00Z"
  },
  "message": "令牌刷新成功"
}
```

### 6. 获取认证状态

**接口**: `GET /auth/status`

**描述**: 检查用户当前的认证状态

**请求头**:

```
Authorization: Bearer <jwt_token>
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "github_user_123",
      "email": "user@example.com",
      "name": "张三",
      "image": "https://avatar.url"
    }
  },
  "message": "用户已认证"
}
```

## 工具接口

### 健康检查

**接口**: `GET /health`

**描述**: 服务健康检查

**响应示例**:

```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0"
}
```

### 服务信息

**接口**: `GET /info`

**描述**: 获取服务信息和可用端点

**响应示例**:

```json
{
  "service": "Telos Auth Service",
  "version": "1.0.0",
  "description": "认证服务，提供用户登录、登出和信息同步功能",
  "endpoints": {
    "auth": {
      "signin": "POST /api/v1/auth/signin",
      "signout": "POST /api/v1/auth/signout",
      "sync": "POST /api/v1/auth/sync",
      "profile": "GET /api/v1/auth/profile",
      "refresh": "POST /api/v1/auth/refresh",
      "status": "GET /api/v1/auth/status"
    },
    "health": "GET /api/v1/health",
    "info": "GET /api/v1/info"
  }
}
```

## 错误响应

所有接口在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误码

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证或认证失败
- `404 Not Found`: 用户不存在
- `500 Internal Server Error`: 服务器内部错误

## JWT Token 格式

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

```json
{
  "sub": "github_user_123",
  "email": "user@example.com",
  "name": "张三",
  "image": "https://avatar.url",
  "iat": 1640995200,
  "exp": 1641081600
}
```

## 使用示例

### 使用 curl 测试

```bash
# 1. 用户登录
curl -X POST http://localhost:8080/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "id": "github_user_123",
    "email": "user@example.com",
    "name": "张三",
    "image": "https://avatar.url",
    "provider": "github"
  }'

# 2. 获取用户资料（需要JWT token）
curl -X GET http://localhost:8080/api/v1/auth/profile \
  -H "Authorization: Bearer <your_jwt_token>"

# 3. 同步用户信息
curl -X POST http://localhost:8080/api/v1/auth/sync \
  -H "Authorization: Bearer <your_jwt_token>"

# 4. 用户登出
curl -X POST http://localhost:8080/api/v1/auth/signout \
  -H "Authorization: Bearer <your_jwt_token>"

# 5. 健康检查
curl -X GET http://localhost:8080/api/v1/health
```

### 使用 JavaScript 测试

```javascript
// 用户登录
const loginResponse = await fetch("/api/v1/auth/signin", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: "github_user_123",
    email: "user@example.com",
    name: "张三",
    image: "https://avatar.url",
    provider: "github",
  }),
})

const loginData = await loginResponse.json()

// 获取用户资料
const profileResponse = await fetch("/api/v1/auth/profile", {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
})

const profileData = await profileResponse.json()

// 用户登出
const logoutResponse = await fetch("/api/v1/auth/signout", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
})
```

## 环境配置

确保以下环境变量已正确配置：

```env
# JWT 密钥（与前端 NextAuth 相同）
AUTH_SECRET=your-jwt-secret-key

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=telos
DB_USER=postgres
DB_PASSWORD=password

# 服务配置
PORT=8080
SERVICE_NAME=auth-service
```

## 数据库表结构

### users 表

```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    image VARCHAR(500),
    provider VARCHAR(50) DEFAULT 'local',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

## 注意事项

1. **JWT 密钥**: 确保 `AUTH_SECRET` 与前端 NextAuth 配置的密钥一致
2. **用户 ID**: 使用 OAuth 提供商的用户 ID 作为主键，确保唯一性
3. **密码字段**: OAuth 用户可能没有密码，该字段可为空
4. **登录记录**: 每次登录都会更新 `last_login_at` 字段
5. **信息同步**: `/auth/sync` 接口会根据 JWT token 中的信息更新数据库
6. **错误处理**: 所有接口都有统一的错误响应格式
7. **日志记录**: 所有操作都会记录详细的日志信息

---

**更新日期**: 2024 年 1 月  
**版本**: v1.0.0  
**维护者**: Telos 后端团队
