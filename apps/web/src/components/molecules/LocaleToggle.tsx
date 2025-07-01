'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Globe } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms'
import appConfig from '@/appConfig'

export function LocaleToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('Common')

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }

  const getLocaleName = (code: string) => {
    const localeNames: Record<string, string> = {
      en: 'English',
      zh: '简体中文',
    }
    return localeNames[code] || code
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='icon'>
          <Globe className='h-4 w-4' />
          <span className='sr-only'>{t('toggleLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {appConfig.locales.map(loc => (
          <DropdownMenuItem key={loc} onClick={() => handleLocaleChange(loc)}>
            {getLocaleName(loc)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
