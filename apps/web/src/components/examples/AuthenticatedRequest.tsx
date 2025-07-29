import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'
import { JWTService } from '@/lib/jwt-service'

// 认证请求示例组件
export function AuthenticatedRequest() {
  const { data: session, status } = useSession()
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 测试获取用户资料
  const handleGetProfile = async () => {
    if (!session) {
      alert('请先登录')
      return
    }

    setLoading(true)
    try {
      // 检查是否有 token
      const hasToken = JWTService.hasValidToken()
      console.log('是否有有效 token:', hasToken)

      // 调用后端 API
      const result = await fetch('/api/user/profile')
      const data = await result.json()

      setResponse(data)
    } catch (error) {
      console.error('请求失败:', error)
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 测试调用后端微服务
  const handleCallBackend = async () => {
    if (!session) {
      alert('请先登录')
      return
    }

    setLoading(true)
    try {
      // 直接调用后端微服务
      const result = await apiClient.syncUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        provider: 'github',
      })

      setResponse(result)
    } catch (error) {
      console.error('后端调用失败:', error)
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div>加载中...</div>
  }

  if (!session) {
    return <div>请先登录以测试认证请求</div>
  }

  return (
    <div className='p-6 max-w-2xl mx-auto'>
      <h2 className='text-2xl font-bold mb-4'>认证请求测试</h2>

      <div className='mb-4'>
        <p>
          <strong>当前用户:</strong> {session.user?.name}
        </p>
        <p>
          <strong>邮箱:</strong> {session.user?.email}
        </p>
        <p>
          <strong>Token 状态:</strong>{' '}
          {JWTService.hasValidToken() ? '✅ 有效' : '❌ 无效'}
        </p>
      </div>

      <div className='space-x-4 mb-6'>
        <button
          onClick={handleGetProfile}
          disabled={loading}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50'
        >
          {loading ? '请求中...' : '获取用户资料'}
        </button>

        <button
          onClick={handleCallBackend}
          disabled={loading}
          className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50'
        >
          {loading ? '请求中...' : '调用后端微服务'}
        </button>
      </div>

      {response && (
        <div className='mt-4'>
          <h3 className='text-lg font-semibold mb-2'>响应结果:</h3>
          <pre className='bg-gray-100 p-4 rounded overflow-auto text-sm'>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
