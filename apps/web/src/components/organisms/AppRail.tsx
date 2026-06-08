'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import {
  TelosMark,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/atoms'
import { LocaleToggle, ThemeToggle, UserAvatar } from '@/components/molecules'
import { McpServersModal } from '@/components/molecules/McpServersModal'
import { Bot, Home, Settings, Sparkles, Wrench } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const normalizePath = (path: string) => path.replace(/\/$/, '') || '/'

export function AppRail() {
  const [showMcpModal, setShowMcpModal] = useState(false)
  const t = useTranslations('Navbar')
  const pathname = normalizePath(usePathname())
  const navigation = [
    { label: t('home'), href: '/', icon: Home },
    { label: t('chat'), href: '/chat', icon: Sparkles },
    { label: t('agents'), href: '/agents', icon: Bot },
    { label: t('tools'), href: '/tools', icon: Wrench },
  ]

  return (
    <aside className='hidden h-screen w-[68px] shrink-0 border-r border-border/60 bg-muted/30 md:flex md:flex-col md:items-center'>
      <div className='flex h-16 items-center justify-center'>
        <Link
          href='/'
          className='rounded-md bg-background/70 p-2 shadow-sm ring-1 ring-border/50 transition-colors hover:bg-background'
        >
          <TelosMark className='size-7' />
        </Link>
      </div>

      <nav className='flex flex-1 flex-col items-center gap-1 px-2 pt-2'>
        {navigation.map(item => {
          const Icon = item.icon
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === normalizePath(item.href) ||
                pathname.endsWith(normalizePath(item.href))

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-md bg-muted/45 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground',
                    active &&
                      'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  )}
                >
                  <Icon className='size-4.5' />
                </Link>
              </TooltipTrigger>
              <TooltipContent side='right'>{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className='flex flex-col items-center gap-2 px-2 pb-3'>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              onClick={() => setShowMcpModal(true)}
              aria-label={t('settings')}
              className='flex size-10 items-center justify-center rounded-md bg-muted/45 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground'
            >
              <Settings className='size-4.5' />
            </button>
          </TooltipTrigger>
          <TooltipContent side='right'>{t('settings')}</TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <LocaleToggle />
        <UserAvatar />
      </div>

      {showMcpModal && (
        <McpServersModal onClose={() => setShowMcpModal(false)} />
      )}
    </aside>
  )
}
