'use client'

import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
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

export function UserAvatar() {
  const { data: session, status } = useSession()
  const t = useTranslations('UserMenu')

  if (status === 'loading') {
    return <Skeleton className='h-8 w-8 rounded-full' />
  }

  if (status === 'unauthenticated' || !session?.user) {
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
    console.log('开始登出流程')
    await signOut({ callbackUrl: '/' })
    console.log('登出流程完成')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
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
        <DropdownMenuItem asChild>
          <CustomLink href='/settings' className='cursor-pointer'>
            <Settings className='mr-2 h-4 w-4' />
            {t('settings')}
          </CustomLink>
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
  )
}
