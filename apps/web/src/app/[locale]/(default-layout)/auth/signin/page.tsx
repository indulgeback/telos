'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Loader2, MailCheck } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/atoms'
import { CustomLink } from '@/components/molecules'
import { authClient } from '@/lib/auth-client'

type SocialProvider = 'github' | 'google' | 'discord' | 'slack'

interface ProviderOption {
  id: SocialProvider
  label: string
  icon: React.ReactNode
}

function GithubLogo() {
  return (
    <svg aria-hidden='true' className='size-4' viewBox='0 0 24 24'>
      <path
        fill='currentColor'
        d='M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.14 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z'
      />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg aria-hidden='true' className='size-4' viewBox='0 0 48 48'>
      <path
        fill='#FFC107'
        d='M43.61 20.08H42V20H24v8h11.3C33.65 32.66 29.22 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z'
      />
      <path
        fill='#FF3D00'
        d='m6.31 14.69 6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z'
      />
      <path
        fill='#4CAF50'
        d='M24 44c5.17 0 9.86-1.98 13.41-5.19l-6.19-5.24C29.21 35.09 26.72 36 24 36c-5.2 0-9.61-3.32-11.27-7.95l-6.52 5.02C9.52 39.56 16.23 44 24 44z'
      />
      <path
        fill='#1976D2'
        d='M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.08 5.57l6.19 5.24C36.97 39.21 44 34 44 24c0-1.34-.14-2.65-.39-3.92z'
      />
    </svg>
  )
}

function DiscordLogo() {
  return (
    <svg aria-hidden='true' className='size-4' viewBox='0 0 24 24'>
      <path
        fill='#5865F2'
        d='M20.32 4.37a19.79 19.79 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06c0 .02.01.04.03.06a19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99.02-.04 0-.09-.04-.11a13.09 13.09 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.08.08 0 0 1 .08-.01c3.92 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.1.25.2.37.29.04.03.04.1-.01.13-.6.35-1.23.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99.02.03.05.04.08.03a19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.98 0c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z'
      />
    </svg>
  )
}

function SlackLogo() {
  return (
    <svg aria-hidden='true' className='size-4' viewBox='0 0 122.8 122.8'>
      <path
        fill='#36C5F0'
        d='M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z'
      />
      <path
        fill='#2EB67D'
        d='M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z'
      />
      <path
        fill='#ECB22E'
        d='M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z'
      />
      <path
        fill='#E01E5A'
        d='M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z'
      />
    </svg>
  )
}

export default function SignInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const error = searchParams.get('error')
  const t = useTranslations('Auth.signIn')
  const tError = useTranslations('Auth.error')

  const [isLoading, setIsLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [isSendingLink, setIsSendingLink] = useState(false)
  const [isLinkSent, setIsLinkSent] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/chat'
  const providers: ProviderOption[] = [
    { id: 'github', label: 'GitHub', icon: <GithubLogo /> },
    { id: 'google', label: 'Google', icon: <GoogleLogo /> },
    { id: 'discord', label: 'Discord', icon: <DiscordLogo /> },
    { id: 'slack', label: 'Slack', icon: <SlackLogo /> },
  ]

  useEffect(() => {
    if (session && !isPending) {
      router.push(callbackUrl)
    }
  }, [session, isPending, callbackUrl, router])

  const handleSignIn = async (provider: SocialProvider) => {
    setIsLoading(true)
    setLoadingProvider(provider)
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: callbackUrl,
      })
    } catch (error) {
      console.error(`${provider} 登录失败:`, error)
      setIsLoading(false)
      setLoadingProvider(null)
    }
  }

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setIsSendingLink(true)
    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: callbackUrl,
      })
      setIsLinkSent(true)
      setIsLoading(false)
      setIsSendingLink(false)
    } catch (err) {
      console.error('发送 Magic Link 失败:', err)
      setIsLoading(false)
      setIsSendingLink(false)
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground'>
      <Card className='w-full max-w-[420px] border-border/80 bg-card shadow-lg'>
        <CardHeader className='space-y-2 text-center'>
          <CardTitle className='text-2xl font-semibold tracking-normal'>
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>

        <CardContent className='space-y-5'>
          {error && (
            <div className='flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
              <AlertCircle className='mt-0.5 size-4 shrink-0' />
              <div className='space-y-1'>
                <p className='font-medium'>{t('loginFailed')}</p>
                <p className='text-xs leading-5 text-destructive/90'>
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

          {isLinkSent ? (
            <div className='flex flex-col items-center gap-3 rounded-md border border-success/30 bg-success/10 p-5 text-center text-success'>
              <div className='flex size-10 items-center justify-center rounded-md bg-success/15'>
                <MailCheck className='size-5' />
              </div>
              <p className='text-sm font-medium leading-6'>
                {t('magicLinkSent')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSignIn} className='space-y-3'>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-foreground'
              >
                {t('emailLabel')}
              </label>
              <Input
                id='email'
                type='email'
                required
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isSendingLink && <Loader2 className='size-4 animate-spin' />}
                {t('sendMagicLink')}
              </Button>
            </form>
          )}

          <div className='relative flex items-center justify-center'>
            <span className='h-px flex-1 bg-border' />
            <span className='bg-card px-3 text-xs text-muted-foreground'>
              {t('orSocial')}
            </span>
            <span className='h-px flex-1 bg-border' />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            {providers.map(provider => (
              <Button
                key={provider.id}
                type='button'
                variant='outline'
                className='h-10 justify-start px-3'
                onClick={() => handleSignIn(provider.id)}
                disabled={isLoading}
              >
                {isLoading && loadingProvider === provider.id ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  provider.icon
                )}
                <span>{provider.label}</span>
              </Button>
            ))}
          </div>

          <p className='text-center text-sm text-muted-foreground'>
            {t('noAccount')}{' '}
            <CustomLink
              href='/auth/signup'
              className='font-medium text-foreground underline underline-offset-4 hover:text-primary'
            >
              {t('signUp')}
            </CustomLink>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
