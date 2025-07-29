'use client'

import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
} from '@/components/atoms'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { CustomLink } from '@/components/molecules'

const errorMessages: Record<string, string> = {
  Configuration: '服务器配置错误',
  AccessDenied: '访问被拒绝',
  Verification: '验证失败',
  Default: '发生未知错误',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'

  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20'>
            <AlertCircle className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <CardTitle className='text-2xl font-bold'>认证错误</CardTitle>
          <CardDescription>登录过程中发生了错误</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <p>{errorMessage}</p>
          </Alert>

          <div className='space-y-2'>
            <Button asChild className='w-full'>
              <CustomLink href='/auth/signin'>重新登录</CustomLink>
            </Button>

            <Button variant='outline' asChild className='w-full'>
              <CustomLink href='/'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                返回首页
              </CustomLink>
            </Button>
          </div>

          <div className='text-center text-sm text-muted-foreground'>
            <p>如果问题持续存在，请联系技术支持</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
