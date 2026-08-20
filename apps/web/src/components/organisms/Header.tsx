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

  const navLinks: { href: string; label: string }[] = [
    { href: '/#overview', label: 'Overview' },
    { href: '/#use-cases', label: 'Use cases' },
    { href: '/skills', label: 'Skills' },
    { href: '/#prompts', label: 'Prompts' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/#blog', label: 'Blog' },
    { href: '/#updates', label: 'Updates' },
  ]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        scrolled
          ? 'border-border/70 bg-background/92 supports-[backdrop-filter]:bg-background/82'
          : 'border-transparent bg-background/70 supports-[backdrop-filter]:bg-background/55'
      } backdrop-blur-xl`}
    >
      <div className='mx-auto max-w-[1240px] px-4 sm:px-6'>
        <div className='flex h-16 items-center justify-between'>
          <Link href='/' className='cursor-pointer flex items-center'>
            <TelosLogo />
          </Link>

          <NavigationMenu className='hidden items-center gap-3 lg:flex'>
            <NavigationMenuList>
              {navLinks.map(link => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={link.href}
                      className='px-2.5 text-[13px] text-muted-foreground transition-colors duration-300 hover:text-foreground'
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <div className='hidden items-center space-x-1.5 lg:flex'>
            <a
              href='https://github.com/indulgeback/telos'
              target='_blank'
              rel='noopener noreferrer'
            >
              <Button
                variant='outline'
                size='sm'
                className='rounded-full border-foreground/10 bg-transparent shadow-none hover:bg-muted'
              >
                <Github className='h-4 w-4 mr-2' />
                {t('github')}
              </Button>
            </a>
            <ThemeToggle />
            <LocaleToggle />
            <UserAvatar />
          </div>

          <div className='flex items-center lg:hidden'>
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
