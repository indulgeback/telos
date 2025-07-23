'use client'

import { useTranslations } from 'next-intl'
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

function LocaleToggle() {
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
      es: 'Español',
      de: 'Deutsch',
      fr: 'Français',
      pt: 'Português',
      it: 'Italiano',
      ja: '日本語',
      th: 'ไทย',
      pl: 'Polski',
      ko: '한국어',
      ru: 'Русский',
      da: 'Dansk',
      nb: 'Norsk',
      nl: 'Nederlands',
      id: 'Bahasa Indonesia',
      tw: '繁體中文',
      tr: 'Türkçe',
    }
    return localeNames[code] || code
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='relative w-full md:w-9'
        >
          <Globe className='h-4 w-4' />
          <span className='md:hidden block'>{t('toggleLanguage')}</span>
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

export { LocaleToggle }
