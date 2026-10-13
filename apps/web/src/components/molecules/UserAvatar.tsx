'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Skeleton,
} from '@/components/atoms'
import { User, Settings, LogOut } from 'lucide-react'
import { CustomLink } from './CustomLink'
import { SystemSettingsModal } from './SystemSettingsModal'

export function UserAvatar() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const t = useTranslations('UserMenu')
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  if (isPending) {
    return <Skeleton className='h-8 w-8 rounded-full' />
  }

  if (!session) {
    return (
      <Button asChild variant='default' size='sm'>
        <CustomLink href='/auth/signin'>{t('signIn')}</CustomLink>
      </Button>
    )
  }

  const user = session.user
  const userInitials = user.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U'

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      // 用 i18n router 跳转,保留当前语言前缀;失败时提示而不是静默卡住
      await router.replace('/')
      router.refresh()
    } catch (error) {
      console.error('登出失败', error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='relative size-10 rounded-md bg-muted/45 p-0 hover:bg-background/80'
          >
            <Avatar className='h-8 w-8'>
              <AvatarImage src={user.image || ''} alt={user.name || ''} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>
                {user.name || t('unknownUser')}
              </p>
              <p className='text-xs leading-none text-muted-foreground'>
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <CustomLink href='/profile' className='cursor-pointer'>
              <User className='mr-2 h-4 w-4' />
              {t('profile')}
            </CustomLink>
          </DropdownMenuItem>
          <DropdownMenuItem
            className='cursor-pointer'
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings className='mr-2 h-4 w-4' />
            {t('settings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='cursor-pointer text-destructive focus:text-destructive/80'
            onClick={handleSignOut}
          >
            <LogOut className='mr-2 h-4 w-4' />
            {t('signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showSettingsModal && (
        <SystemSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  )
}
