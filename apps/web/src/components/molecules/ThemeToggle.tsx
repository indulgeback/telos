'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Laptop } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms'

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('Common')

  // 使用 useEffect 的清理函数来避免在 effect 中直接 setState
  useEffect(() => {
    // 使用 setTimeout 确保在下一个 tick 中更新状态
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <Button variant='outline' size='icon' disabled>
        <Sun className='h-4 w-4' />
      </Button>
    )
  }

  const current = theme === 'system' ? systemTheme : theme

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='relative w-full md:w-9'
        >
          {current === 'light' && <Sun className='h-4 w-4' />}
          {current === 'dark' && <Moon className='h-4 w-4' />}
          {current !== 'light' && current !== 'dark' && (
            <Laptop className='h-4 w-4' />
          )}
          <span className='md:hidden block'>{t('toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Laptop className='mr-2 h-4 w-4' />
          {t('theme.system')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className='mr-2 h-4 w-4' />
          {t('theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className='mr-2 h-4 w-4' />
          {t('theme.dark')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ThemeToggle }
