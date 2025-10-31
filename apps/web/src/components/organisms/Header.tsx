'use client'

import { ThemeToggle, LocaleToggle, UserAvatar } from '@/components/molecules'
import {
  Button,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/atoms'
import { Github, Menu } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'

export function Header() {
  const t = useTranslations('Header')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: t('features') },
    { href: '#tech-stack', label: t('techStack') },
    { href: '#quick-start', label: t('quickStart') },
  ]

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-slate-300 dark:border-slate-700 bg-white/10 dark:bg-slate-900/10 shadow-md'
          : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80'
      } backdrop-blur-xs`}
    >
      <div className='px-4'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <Link href='/' className='flex items-center space-x-2 cursor-pointer'>
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

          {/* 桌面导航 */}
          <NavigationMenu className='hidden md:flex items-center gap-3'>
            <NavigationMenuList>
              {navLinks.map(link => {
                return (
                  <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink
                      href={link.href}
                      className='hover:text-white dark:hover:text-white transition-colors duration-200'
                    >
                      {link.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>

          {/* 桌面端操作按钮 */}
          <div className='hidden md:flex items-center space-x-2'>
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
            <UserAvatar />
          </div>

          {/* 移动端菜单 */}
          <div className='md:hidden flex items-center'>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant='outline' size='icon' aria-label='Open menu'>
                  <Menu className='h-6 w-6' />
                </Button>
              </SheetTrigger>

              <SheetContent side='right' className='p-0 w-72'>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    <p>
                      Lorem ipsum dolor sit amet consectetur adipisicing elit.
                      Quisquam, quos.
                    </p>
                  </SheetDescription>
                </SheetHeader>
                <div className='flex flex-col h-full'>
                  <nav className='flex-1 flex flex-col p-4 space-y-2'>
                    {navLinks.map(link => {
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          className={`block py-2 px-4 rounded-md  hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200`}
                          onClick={() => setOpen(false)}
                        >
                          {link.label}
                        </a>
                      )
                    })}
                  </nav>
                  <SheetFooter>
                    <div className='flex flex-col space-y-2 w-full'>
                      <UserAvatar />
                      <a
                        href='https://github.com/indulgeback/telos'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        <Button variant='outline' size='sm' className='w-full'>
                          <Github className='h-4 w-4 mr-2' />
                          GitHub
                        </Button>
                      </a>
                      <div className='flex space-x-2'>
                        <ThemeToggle />
                        <LocaleToggle />
                      </div>
                    </div>
                  </SheetFooter>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
