'use client'

import { signIn, useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@/components/atoms'
import { Github, Mail, Loader2, AlertCircle } from 'lucide-react'
import { CustomLink } from '@/components/molecules'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')

  // 如果用户已经登录，直接跳转到目标页面
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl)
    }
  }, [status, session, callbackUrl, router])

  const handleSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      // 对于 OAuth 提供者，使用默认重定向（这是必需的）
      await signIn(provider, { callbackUrl })
    } catch (error) {
      console.error('登录失败:', error)
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await signIn('email', {
        email,
        callbackUrl,
        redirect: false,
      })

      if (result?.error) {
        console.error('邮箱登录失败:', result.error)
      } else if (result?.ok) {
        router.push(callbackUrl)
      }
    } catch (error) {
      console.error('邮箱登录失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>欢迎回来</CardTitle>
          <CardDescription>登录到 Telos 智能工作流平台</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {error && (
            <div className='flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-destructive rounded-md border border-destructive/20 dark:border-destructive/80'>
              <AlertCircle className='h-4 w-4' />
              <p>登录失败，请重试</p>
            </div>
          )}

          {/* 社交登录按钮 */}
          <div className='space-y-2'>
            <Button
              variant='outline'
              className='w-full'
              onClick={() => handleSignIn('github')}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Github className='mr-2 h-4 w-4' />
              )}
              使用 GitHub 登录
            </Button>
          </div>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                或者
              </span>
            </div>
          </div>

          {/* 邮箱登录表单 - 暂时禁用，需要配置邮箱提供者 */}
          <div className='space-y-4 opacity-50'>
            <div className='space-y-2'>
              <Label htmlFor='email'>邮箱地址</Label>
              <Input
                id='email'
                type='email'
                placeholder='your@email.com'
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled
              />
            </div>
            <Button type='button' className='w-full' disabled>
              <Mail className='mr-2 h-4 w-4' />
              发送登录链接（即将推出）
            </Button>
          </div>

          <p className='text-center text-sm text-muted-foreground'>
            还没有账户？{' '}
            <CustomLink
              href='/auth/signup'
              className='underline underline-offset-4 hover:text-primary'
            >
              立即注册
            </CustomLink>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
