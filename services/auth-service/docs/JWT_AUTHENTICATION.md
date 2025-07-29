# JWT 认证和权限控制文档

## 概述

本文档说明了 Telos 微服务中 JWT 认证和基于角色的访问控制 (RBAC) 的实现方式。

## 架构流程

```
前端 NextAuth → 生成 JWT → 发送到后端 → JWT 中间件验证 → 权限检查 → 业务逻辑
```

## JWT Token 格式

### Payload 结构

```json
{
  "sub": "github_user_123", // 用户 ID
  "email": "user@example.com", // 用户邮箱
  "name": "张三", // 用户姓名
  "image": "https://avatar.url", // 用户头像
  "iat": 1640995200, // 签发时间
  "exp": 1641081600 // 过期时间
}
```

### Header 结构

```json
{
  "alg": "HS256", // 签名算法
  "typ": "JWT" // Token 类型
}
```

## 中间件使用

### 1. JWT 认证中间件

```go
// 应用到路由组
authenticated := router.Group("/api/v1")
authenticated.Use(middleware.JWTMiddleware())

// 应用到单个路由
router.GET("/protected", middleware.RequireAuth(handler))
```

### 2. 权限控制中间件

```go
// 需要特定权限
router.PUT("/users/profile",
    middleware.JWTMiddleware(),
    middleware.RequirePermission(middleware.PermissionWrite),
    controller.UpdateProfile,
)

// 需要特定角色
router.GET("/admin/dashboard",
    middleware.JWTMiddleware(),
    middleware.RequireRole(middleware.RoleAdmin),
    controller.AdminDashboard,
)
```

## 角色和权限系统

### 用户角色

| 角色        | 说明       | 权限       |
| ----------- | ---------- | ---------- |
| `admin`     | 系统管理员 | 所有权限   |
| `moderator` | 版主       | 读取、写入 |
| `user`      | 普通用户   | 读取、写入 |
| `guest`     | 访客       | 仅读取     |

### 权限类型

| 权限     | 说明     | 适用操作       |
| -------- | -------- | -------------- |
| `read`   | 读取权限 | GET 请求       |
| `write`  | 写入权限 | POST, PUT 请求 |
| `delete` | 删除权限 | DELETE 请求    |
| `admin`  | 管理权限 | 管理员操作     |

## 控制器中获取用户信息

```go
func (c *Controller) SomeHandler(ctx *gin.Context) {
    // 获取用户信息
    userID, userEmail, userName, userImage, exists := middleware.GetUserFromContext(ctx)
    if !exists {
        ctx.JSON(401, gin.H{"error": "用户未认证"})
        return
    }

    // 使用用户信息
    fmt.Printf("用户 %s (%s) 正在访问资源\n", userName, userEmail)

    // 业务逻辑...
}
```

## 路由配置示例

### 基础认证路由

```go
// 需要认证但无特殊权限要求
authenticated := router.Group("/api/v1")
authenticated.Use(middleware.JWTMiddleware())
{
    authenticated.GET("/profile", controller.GetProfile)
    authenticated.POST("/logout", controller.Logout)
}
```

### 权限控制路由

```go
// 用户管理路由
users := authenticated.Group("/users")
{
    // 查看用户列表 - 需要读权限
    users.GET("/",
        middleware.RequirePermission(middleware.PermissionRead),
        controller.ListUsers,
    )

    // 创建用户 - 需要写权限
    users.POST("/",
        middleware.RequirePermission(middleware.PermissionWrite),
        controller.CreateUser,
    )

    // 删除用户 - 需要删除权限
    users.DELETE("/:id",
        middleware.RequirePermission(middleware.PermissionDelete),
        controller.DeleteUser,
    )
}
```

### 角色控制路由

```go
// 管理员专用路由
admin := authenticated.Group("/admin")
admin.Use(middleware.RequireRole(middleware.RoleAdmin))
{
    admin.GET("/dashboard", controller.AdminDashboard)
    admin.GET("/system/stats", controller.SystemStats)
    admin.POST("/system/config", controller.UpdateConfig)
}
```

## 环境配置

### 必需的环境变量

```env
# JWT 密钥（与前端 NextAuth 相同）
AUTH_SECRET="your-jwt-secret-key"

# 数据库连接（用于用户角色查询）
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="telos"
DB_USER="postgres"
DB_PASSWORD="password"
```

### Go 依赖

```go
// go.mod
require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.0.0
)
```

## 错误处理

### 常见错误响应

```json
// 缺少 token
{
  "success": false,
  "error": "缺少认证 token"
}

// token 无效
{
  "success": false,
  "error": "token 验证失败: invalid signature"
}

// token 过期
{
  "success": false,
  "error": "token 验证失败: token is expired"
}

// 权限不足
{
  "success": false,
  "error": "权限不足"
}

// 角色不匹配
{
  "success": false,
  "error": "角色权限不足"
}
```

## 安全最佳实践

### 1. Token 安全

- 使用强密钥生成 JWT
- 设置合理的过期时间
- 在 HTTPS 环境下传输
- 不在 URL 中传递 token

### 2. 权限控制

- 最小权限原则
- 定期审查用户权限
- 记录敏感操作日志
- 实现权限继承机制

### 3. 错误处理

- 不泄露敏感信息
- 统一错误响应格式
- 记录安全相关日志
- 实现请求频率限制

## 测试示例

### 使用 curl 测试

```bash
# 获取 JWT token（从前端获取）
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 测试认证接口
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/v1/users/profile

# 测试权限控制
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"新名称"}' \
     http://localhost:8080/api/v1/users/profile

# 测试管理员接口
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/v1/admin/dashboard
```

### 使用 Postman 测试

1. 设置 Authorization header: `Bearer <your-jwt-token>`
2. 发送请求到受保护的端点
3. 检查响应状态码和内容

## 故障排除

### 常见问题

1. **Token 验证失败**

   - 检查 AUTH_SECRET 是否与前端一致
   - 确认 token 格式正确
   - 验证 token 是否过期

2. **权限被拒绝**

   - 检查用户角色配置
   - 确认权限映射正确
   - 验证中间件执行顺序

3. **用户信息获取失败**
   - 确认 JWT 中间件正确执行
   - 检查上下文信息设置
   - 验证 token payload 结构

### 调试技巧

```go
// 启用调试日志
func debugJWT(c *gin.Context) {
    token := c.GetHeader("Authorization")
    fmt.Printf("收到 token: %s\n", token)

    userID, _ := c.Get("user_id")
    fmt.Printf("解析用户 ID: %s\n", userID)
}
```

## 扩展功能

### 1. Token 刷新机制

```go
// 实现 refresh token 逻辑
func RefreshToken(c *gin.Context) {
    // 验证 refresh token
    // 生成新的 access token
    // 返回新 token
}
```

### 2. 动态权限系统

```go
// 从数据库加载用户权限
func loadUserPermissions(userID string) []Permission {
    // 查询数据库
    // 返回用户权限列表
}
```

### 3. 审计日志

```go
// 记录用户操作
func auditLog(userID, action, resource string) {
    // 记录到日志系统
    // 或存储到数据库
}
```

---

**更新日期**: 2024 年 1 月  
**版本**: v1.0.0  
**维护者**: Telos 后端团队
