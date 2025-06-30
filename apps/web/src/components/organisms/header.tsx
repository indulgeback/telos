'use client'

import { ThemeToggle, LocaleToggle, Button } from '@/components'
import { Github } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function Header() {
  const t = useTranslations('Header')

  return (
    <header className='sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <Link href='/' className='flex items-center space-x-2'>
            <Image
              src='/favicon.png'
              alt='Telos'
              width={32}
              height={32}
              className='rounded-lg'
            />
            <span className='font-bold text-xl text-slate-900 dark:text-white'>
              Telos
            </span>
          </Link>

          {/* Navigation */}
          <nav className='hidden md:flex items-center space-x-6'>
            <a
              href='#features'
              className='text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors'
            >
              {t('features')}
            </a>
            <a
              href='#tech-stack'
              className='text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors'
            >
              {t('techStack')}
            </a>
            <a
              href='#quick-start'
              className='text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors'
            >
              {t('quickStart')}
            </a>
          </nav>

          {/* Actions */}
          <div className='flex items-center space-x-2'>
            <Button variant='outline' size='sm'>
              <Github className='h-4 w-4 mr-2' />
              GitHub
            </Button>
            <ThemeToggle />
            <LocaleToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
