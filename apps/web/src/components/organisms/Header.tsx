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
  TelosLogo,
} from '@/components/atoms'
import { Github, Menu } from 'lucide-react'
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

  const navLinks: { href: string; label: string }[] = []

  return (
    <header className='fixed inset-x-0 top-0 z-40 px-3 pt-3 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'>
      <div
        className={`mx-auto max-w-7xl rounded-full border px-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          scrolled
            ? 'border-border/70 bg-background/78 shadow-[0_18px_70px_hsl(var(--foreground)/0.08)] supports-[backdrop-filter]:bg-background/72'
            : 'border-foreground/10 bg-background/36 shadow-[0_12px_48px_hsl(var(--foreground)/0.05)] supports-[backdrop-filter]:bg-background/32'
        } backdrop-blur-xl`}
      >
        <div className='flex h-12 items-center justify-between'>
          <Link href='/' className='cursor-pointer flex items-center'>
            <TelosLogo />
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
              <Button
                variant='outline'
                size='sm'
                className='rounded-full border-foreground/10 bg-background/35 shadow-none hover:bg-background/70'
              >
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
                <Button
                  variant='outline'
                  size='icon'
                  aria-label='Open menu'
                  className='rounded-full border-foreground/10 bg-background/35 shadow-none hover:bg-background/70'
                >
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
