# 使用 NextAuth Cookie 中的 JWT Token

## 📋 概述

我们简化了 JWT 认证方案，直接使用 NextAuth 存储在 cookie 中的 JWT token，无需重新生成。

## 🔧 **工作原理**

### **1. NextAuth 自动生成 JWT**

```typescript
// auth.ts 配置
const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET!, // JWT 签名密钥
  session: {
    strategy: 'jwt', // 使用 JWT 策略
    maxAge: 30 * 24 * 60 * 60, // 30 天过期
  },
}
```

### **2. JWT 存储在 Cookie 中**

NextAuth 自动将 JWT 存储在浏览器 cookie 中：

- **开发环境**: `next-auth.session-token`
- **生产环境**: `__Secure-next-auth.session-token`

### **3. 前端读取 Cookie 中的 Token**

```typescript
// jwt-service.ts
export class JWTService {
  static getTokenFromCookie(): string | null {
    const cookieName =
      process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token'

    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${cookieName}=`)
    )

    if (sessionCookie) {
      const token = sessionCookie.split('=')[1]
      return decodeURIComponent(token)
    }

    return null
  }
}
```

### **4. API 客户端自动添加 Token**

```typescript
// api-client.ts
class ApiClient {
  private getAuthToken(): string | null {
    return JWTService.getTokenFromCookie()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken()

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    // 发送请求...
  }
}
```

## 🚀 **使用示例**

### **在组件中使用**

```typescript
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'
import { JWTService } from '@/lib/jwt-service'

export function MyComponent() {
  const { data: session } = useSession()

  const handleApiCall = async () => {
    // 检查是否有有效 token
    if (!JWTService.hasValidToken()) {
      console.log('没有有效的认证 token')
      return
    }

    try {
      // API 客户端会自动添加 Authorization header
      const result = await apiClient.syncUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        provider: 'github'
      })

      console.log('API 调用成功:', result)
    } catch (error) {
      console.error('API 调用失败:', error)
    }
  }

  return (
    <button onClick={handleApiCall}>
      调用后端 API
    </button>
  )
}
```

### **在 API 路由中使用**

```typescript
// app/api/user/profile/route.ts
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  // 从请求中获取 JWT token
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  })

  if (!token) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  // 使用 token 中的用户信息
  const userProfile = {
    id: token.sub,
    email: token.email,
    name: token.name,
    image: token.image,
  }

  return Response.json({ user: userProfile })
}
```

## 🔐 **后端验证**

后端 Go 微服务使用相同的 `AUTH_SECRET` 验证 JWT：

```go
// middleware/jwt.go
func validateJWT(tokenString string) (*JWTClaims, error) {
    secret := os.Getenv("AUTH_SECRET")

    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte(secret), nil
    })

    if err != nil || !token.Valid {
        return nil, fmt.Errorf("无效的 token")
    }

    claims, ok := token.Claims.(*JWTClaims)
    if !ok {
        return nil, fmt.Errorf("无法解析 token 声明")
    }

    return claims, nil
}
```

## ✅ **优势**

1. **简化架构**: 无需重新生成 JWT，直接使用 NextAuth 的 token
2. **自动同步**: 前后端使用相同的密钥和 token
3. **无缝集成**: 与 NextAuth 的会话管理完全兼容
4. **安全可靠**: 使用标准的 JWT 格式和签名验证

## 🔄 **完整流程**

```
1. 用户登录 → NextAuth 生成 JWT → 存储到 cookie
2. 前端请求 → 从 cookie 读取 JWT → 添加到 Authorization header
3. 后端接收 → 验证 JWT 签名 → 提取用户信息 → 执行业务逻辑
```

## 🛠️ **环境配置**

确保前后端使用相同的 JWT 密钥：

```env
# 前端 .env.local
AUTH_SECRET="your-jwt-secret-key"

# 后端环境变量
AUTH_SECRET="your-jwt-secret-key"
```

这样就实现了一个简洁、高效的 JWT 认证系统！
