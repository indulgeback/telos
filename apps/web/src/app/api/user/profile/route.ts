import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/jwt-utils'

// 使用 JWT 认证的 API 路由示例
export async function GET(req: NextRequest) {
  return withAuth(req, async (req, user) => {
    // 这里 user 已经通过 JWT 验证
    console.log('认证用户:', user)

    // 调用后端 API 获取用户资料
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BACKEND_API_KEY}`, // 后端服务间认证
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return Response.json(
        { error: '获取用户资料失败' },
        { status: response.status }
      )
    }

    const userData = await response.json()
    return Response.json(userData)
  })
}

export async function PUT(req: NextRequest) {
  return withAuth(req, async (req, user) => {
    const body = await req.json()

    // 更新用户资料
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      return Response.json(
        { error: '更新用户资料失败' },
        { status: response.status }
      )
    }

    const updatedUser = await response.json()
    return Response.json(updatedUser)
  })
}
