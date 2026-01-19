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
    { href: '/features', label: t('features') },
    { href: '/workflow-templates', label: t('workflowTemplates') },
    { href: '/integrations', label: t('integrations') },
    { href: '/real-world-use-cases', label: t('useCases') },
    { href: '/showcase', label: t('showcase') },
    { href: '/roadmap', label: t('roadmap') },
    { href: '/comparison', label: t('comparison') },
    { href: '/pricing', label: t('pricing') },
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
  ]

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-border bg-background/60 shadow-md'
          : 'border-border/50 bg-background/80'
      } backdrop-blur-xs`}
    >
      <div className='px-4'>
        <div className='flex h-16 items-center justify-between'>
          <Link href='/' className='flex items-center space-x-2 cursor-pointer'>
            <Image
              src='/favicon.png'
              alt='Telos'
              width={32}
              height={32}
              className='rounded-lg'
            />
            <span className='font-bold text-xl text-foreground'>Telos</span>
          </Link>

          <NavigationMenu className='hidden md:flex items-center gap-3'>
            <NavigationMenuList>
              {navLinks.map(link => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={link.href}
                      className='hover:text-primary transition-colors duration-200'
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <div className='hidden md:flex items-center space-x-2'>
            <a
              href='https://github.com/indulgeback/telos'
              target='_blank'
              rel='noopener noreferrer'
            >
              <Button variant='outline' size='sm'>
                <Github className='h-4 w-4 mr-2' />
                {t('github')}
              </Button>
            </a>
            <ThemeToggle />
            <LocaleToggle />
            <UserAvatar />
          </div>

          <div className='md:hidden flex items-center'>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant='outline' size='icon' aria-label='Open menu'>
                  <Menu className='h-6 w-6' />
                </Button>
              </SheetTrigger>
              <SheetContent side='right' className='p-0 w-72'>
                <SheetHeader>
                  <SheetTitle>{t('mobileMenuTitle')}</SheetTitle>
                  <SheetDescription>{t('mobileMenuDesc')}</SheetDescription>
                </SheetHeader>
                <div className='flex flex-col h-full'>
                  <nav className='flex-1 flex flex-col p-4 space-y-2'>
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className='block py-2 px-4 rounded-md hover:bg-muted transition-colors duration-200'
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
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
                          {t('github')}
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
