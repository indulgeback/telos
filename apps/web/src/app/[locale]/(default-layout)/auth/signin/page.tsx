'use client'

import { signIn, useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@/components/atoms'
import { Loader2, AlertCircle } from 'lucide-react'
import { CustomLink } from '@/components/molecules'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')
  const t = useTranslations('Auth.signIn')
  const tError = useTranslations('Auth.error')

  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  // 如果用户已经登录，直接跳转到目标页面
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl)
    }
  }, [status, session, callbackUrl, router])

  const handleSignIn = async (provider: string) => {
    setIsLoading(true)
    setLoadingProvider(provider)
    try {
      // signIn 会触发页面跳转，所以不需要重置loading状态
      await signIn(provider, { callbackUrl })
    } catch (error) {
      console.error(`${provider} 登录失败:`, error)
      // 只有发生错误时才重置loading状态
      setIsLoading(false)
      setLoadingProvider(null)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {error && (
            <div className='flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-destructive rounded-md border border-destructive/20 dark:border-destructive/80'>
              <AlertCircle className='h-4 w-4' />
              <div>
                <p className='font-medium'>{t('loginFailed')}</p>
                <p className='text-xs mt-1 opacity-90'>
                  {error === 'OAuthSignin' && tError('oauthSignin')}
                  {error === 'OAuthCallback' && tError('oauthCallback')}
                  {error === 'OAuthCreateAccount' &&
                    tError('oauthCreateAccount')}
                  {error === 'AccessDenied' && tError('accessDenied')}
                  {error === 'Verification' && tError('verification')}
                  {error === 'OAuthAccountNotLinked' &&
                    tError('oauthAccountNotLinked')}
                  {![
                    'OAuthSignin',
                    'OAuthCallback',
                    'OAuthCreateAccount',
                    'AccessDenied',
                    'Verification',
                    'OAuthAccountNotLinked',
                  ].includes(error) && tError('unknownError')}
                </p>
              </div>
            </div>
          )}

          {/* GitHub 登录按钮 */}
          <Button
            type='button'
            className='w-full'
            onClick={() => handleSignIn('github')}
            disabled={isLoading}
          >
            {isLoading && loadingProvider === 'github' && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {t('github')}
          </Button>

          <p className='text-center text-sm text-muted-foreground'>
            {t('noAccount')}{' '}
            <CustomLink
              href='/auth/signup'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('signUp')}
            </CustomLink>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
