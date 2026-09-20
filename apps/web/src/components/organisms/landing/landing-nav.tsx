'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { TelosLogo } from '@/components/atoms/telos-logo'
import { LocaleToggle } from '@/components/molecules/LocaleToggle'
import s from './landing-world.module.css'

export function LandingNav() {
  const t = useTranslations('LandingStudio')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])
  const links = [
    ['/#possibilities', 'v3.navExplore'],
    ['/#meet-t', 'navPossibilities'],
    ['/skills', 'navSkills'],
  ]
  return (
    <header className={s.nav}>
      <a href='#main-content' className={s.skip}>
        {t('skip')}
      </a>
      <div className={s.navInner}>
        <Link href='/' aria-label='Telos' className={s.brand}>
          <TelosLogo />
        </Link>
        <nav className={s.navLinks} aria-label={t('navLabel')}>
          {links.map(([href, key]) => (
            <Link key={key} href={href}>
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className={s.navActions}>
          <div className={s.locale}>
            <LocaleToggle />
          </div>
          <Link className={s.primary} href='/chat'>
            {t('navStart')}
          </Link>
          <button
            className={s.menuButton}
            onClick={() => setOpen(!open)}
            aria-label={t(open ? 'closeMenu' : 'openMenu')}
            aria-expanded={open}
            aria-controls='landing-menu'
          >
            <span aria-hidden='true'>{open ? '×' : '≡'}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav
          id='landing-menu'
          className={s.mobileLinks}
          aria-label={t('navLabel')}
        >
          {links.map(([href, key]) => (
            <Link key={key} href={href} onClick={() => setOpen(false)}>
              {t(key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
