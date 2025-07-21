'use client'

import { ThemeToggle, LocaleToggle } from '@/components/molecules'
import { Button } from '@/components/atoms'
import { Github, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

export function Header() {
  const t = useTranslations('Header')
  const logoRef = useRef(null)
  const navRef = useRef(null)
  const actionsRef = useRef(null)
  const headerRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // 页面加载动画
  useEffect(() => {
    if (!logoRef.current || !navRef.current || !actionsRef.current) return

    // Logo动画
    animate(logoRef.current, {
      translateX: [-40, 0],
      opacity: [0, 1],
      duration: 700,
      easing: 'easeOutCubic',
    })

    // 导航动画
    animate(navRef.current, {
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 700,
      delay: 300,
      easing: 'easeOutCubic',
    })

    // 操作按钮动画
    animate(actionsRef.current, {
      translateX: [40, 0],
      opacity: [0, 1],
      duration: 700,
      delay: 300,
      easing: 'easeOutCubic',
    })
  }, [])

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 关闭移动菜单
  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // 导航链接
  const navLinks = [
    { href: '#features', label: t('features') },
    { href: '#tech-stack', label: t('techStack') },
    { href: '#quick-start', label: t('quickStart') },
  ]

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-slate-300 dark:border-slate-700 bg-white/10 dark:bg-slate-900/10 shadow-md'
          : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80'
      } backdrop-blur-xs`}
    >
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <div
            ref={logoRef}
            className='flex items-center space-x-2 cursor-pointer'
            onClick={() => closeMobileMenu()}
          >
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
          </div>

          {/* 桌面导航 */}
          <nav ref={navRef} className='hidden md:flex items-center space-x-6'>
            {navLinks.map(link => {
              const isActive = pathname.includes(link.href.substring(1))
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`${
                    isActive
                      ? 'text-slate-900 dark:text-white font-medium'
                      : 'text-slate-600 dark:text-slate-300'
                  } hover:text-slate-900 dark:hover:text-white transition-colors duration-200`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          {/* 移动端菜单按钮 */}
          <button
            ref={actionsRef}
            className='md:hidden flex items-center p-2 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className='h-6 w-6' />
            ) : (
              <Menu className='h-6 w-6' />
            )}
          </button>

          {/* 桌面端操作按钮 */}
          <div
            ref={actionsRef}
            className='hidden md:flex items-center space-x-2'
          >
            <a
              href='https://github.com/indulgeback/telos'
              target='_blank'
              rel='noopener noreferrer'
            >
              <Button variant='outline' size='sm'>
                <Github className='h-4 w-4 mr-2' />
                GitHub
              </Button>
            </a>
            <ThemeToggle />
            <LocaleToggle />
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className='md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300'
        >
          <div className='absolute top-0 right-0 w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-lg transform transition-transform duration-300 ease-in-out'>
            <div className='p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800'>
              <span className='font-bold text-xl text-slate-900 dark:text-white'>
                Menu
              </span>
              <button
                className='p-2 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                onClick={() => setMobileMenuOpen(false)}
                aria-label='Close menu'
              >
                <X className='h-6 w-6' />
              </button>
            </div>
            <nav className='p-4 space-y-4'>
              {navLinks.map(link => {
                const isActive = pathname.includes(link.href.substring(1))
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`block py-2 px-4 ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-md'
                        : 'text-slate-600 dark:text-slate-300'
                    } hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200`}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </a>
                )
              })}
              <div className='pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3'>
                <a
                  href='https://github.com/indulgeback/telos'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <Button variant='outline' size='sm'>
                    <Github className='h-4 w-4 mr-2' />
                    GitHub
                  </Button>
                </a>
                <div className='flex items-center justify-between space-x-2'>
                  <ThemeToggle />
                  <LocaleToggle />
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
