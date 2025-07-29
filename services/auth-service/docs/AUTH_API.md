# 认证服务 API 文档

## 概述

认证服务提供用户登录、登出和信息同步功能，支持 OAuth 登录和 JWT 认证。

## 基础信息

- **服务名称**: auth-service
- **基础 URL**: `http://localhost:8080/api`
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

## 使用示例

### cURL 示例

```bash
# 1. 用户登录
curl -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "id": "github_user_123",
    "email": "user@example.com",
    "name": "张三",
    "image": "https://avatar.url",
    "provider": "github",
    "accessToken": "oauth_access_token"
  }'

# 2. 同步用户信息（需要JWT token）
curl -X POST http://localhost:8080/api/auth/sync \
  -H "Authorization: Bearer <your_jwt_token>"

# 3. 用户登出
curl -X POST http://localhost:8080/api/auth/signout \
  -H "Authorization: Bearer <your_jwt_token>"

# 4. 健康检查
curl -X GET http://localhost:8080/api/health
```

### JavaScript 示例

```javascript
// 用户登录
const loginResponse = await fetch("/api/auth/signin", {
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
    accessToken: "oauth_access_token",
  }),
})

const loginData = await loginResponse.json()
const jwtToken = loginData.token // 从响应中获取JWT token

// 同步用户信息
const syncResponse = await fetch("/api/auth/sync", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
})

const syncData = await syncResponse.json()

// 用户登出
const logoutResponse = await fetch("/api/auth/signout", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
})

const logoutData = await logoutResponse.json()
```

## 错误处理

### 常见错误响应

**400 Bad Request** - 请求参数错误

```json
{
  "success": false,
  "error": "请求数据格式错误: 缺少必需字段"
}
```

**401 Unauthorized** - 认证失败

```json
{
  "success": false,
  "error": "用户信息获取失败"
}
```

**404 Not Found** - 用户不存在

```json
{
  "success": false,
  "error": "用户不存在"
}
```

**500 Internal Server Error** - 服务器内部错误

```json
{
  "success": false,
  "error": "用户创建失败"
}
```

## 注意事项

1. **JWT Token**: 登录成功后需要保存返回的 JWT token，用于后续的认证请求
2. **用户创建**: 首次登录时会自动创建用户记录
3. **信息同步**: sync 接口会从 JWT token 中获取最新用户信息并更新数据库
4. **错误处理**: 所有接口都会返回统一的错误格式
5. **日志记录**: 服务会记录所有操作的详细日志

---

**更新日期**: 2024 年 1 月  
**版本**: v1.0.0  
**维护者**: Telos 后端团队
