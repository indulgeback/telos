'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { GoogleIcon } from '@/components/atoms/icons'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')
  const t = useTranslations('Auth.signIn')
  const tError = useTranslations('Auth.error')

  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleSignIn = async (provider: string) => {
    setIsLoading(true)
    setLoadingProvider(provider)
    try {
      await signIn(provider, { callbackUrl })
    } catch (error) {
      console.error(`${provider} 登录失败:`, error)
    } finally {
      setIsLoading(false)
      setLoadingProvider(null)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn('email', { email, callbackUrl })
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
          <CardTitle className='text-2xl font-bold'>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {error && (
            <div className='flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800'>
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

          {/* 社交登录按钮 */}
          <div className='space-y-2'>
            <Button
              variant='outline'
              className='w-full'
              onClick={() => handleSignIn('google')}
              disabled={isLoading}
            >
              {loadingProvider === 'google' ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <GoogleIcon className='mr-2' size={16} />
              )}
              {t('signInWithGoogle')}
            </Button>

            <Button
              variant='outline'
              className='w-full'
              onClick={() => handleSignIn('github')}
              disabled={isLoading}
            >
              {loadingProvider === 'github' ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Github className='mr-2 h-4 w-4' />
              )}
              {t('signInWithGitHub')}
            </Button>
          </div>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                {t('or')}
              </span>
            </div>
          </div>

          {/* 邮箱登录表单 - 暂时禁用，需要配置邮箱提供者 */}
          <div className='space-y-4 opacity-50'>
            <div className='space-y-2'>
              <Label htmlFor='email'>{t('emailLabel')}</Label>
              <Input
                id='email'
                type='email'
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled
              />
            </div>
            <Button type='button' className='w-full' disabled>
              <Mail className='mr-2 h-4 w-4' />
              {t('signInWithEmail')}
            </Button>
          </div>

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
