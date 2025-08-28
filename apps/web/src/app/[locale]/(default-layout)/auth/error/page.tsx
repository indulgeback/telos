'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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

const getErrorMessage = (error: string, t: any): string => {
  const errorMap: Record<string, string> = {
    Configuration: t('unknownError'),
    AccessDenied: t('accessDenied'),
    Verification: t('verification'),
    OAuthSignin: t('oauthSignin'),
    OAuthCallback: t('oauthCallback'),
    OAuthCreateAccount: t('oauthCreateAccount'),
    EmailCreateAccount: t('oauthCreateAccount'),
    Callback: t('oauthCallback'),
    OAuthAccountNotLinked: t('oauthAccountNotLinked'),
    EmailSignin: t('unknownError'),
    CredentialsSignin: t('unknownError'),
    SessionRequired: t('accessDenied'),
    Default: t('unknownError'),
  }
  return errorMap[error] || errorMap.Default
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  const t = useTranslations('Auth.error')
  const tSignIn = useTranslations('Auth.signIn')

  const errorMessage = getErrorMessage(error, t)

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20'>
            <AlertCircle className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <CardTitle className='text-2xl font-bold'>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <p>{errorMessage}</p>
          </Alert>

          <div className='space-y-2'>
            <Button asChild className='w-full'>
              <CustomLink href='/auth/signin'>{tSignIn('tryAgain')}</CustomLink>
            </Button>

            <Button variant='outline' asChild className='w-full'>
              <CustomLink href='/'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                {tSignIn('backToHome')}
              </CustomLink>
            </Button>
          </div>

          <div className='text-center text-sm text-muted-foreground'>
            <p>{t('contactSupport')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
