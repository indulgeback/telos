'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  UserAvatar,
  ThemeToggle,
  LocaleToggle,
  CustomLink,
} from '@/components/molecules'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const navigation = [
  { name: '首页', href: '/' },
  { name: '工作流', href: '/workflows' },
  { name: '仪表板', href: '/dashboard' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='px-4'>
        <div className='flex h-16 items-center justify-between'>
          <div className='flex items-center space-x-8'>
            <CustomLink href='/' className='flex items-center space-x-2'>
              <Image
                src='/favicon.png'
                alt='Telos'
                width={32}
                height={32}
                className='rounded-lg'
              />
              <span className='font-bold text-xl'>Telos</span>
            </CustomLink>

            <div className='hidden md:flex items-center space-x-6'>
              {navigation.map(item => (
                <CustomLink
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    pathname === item.href
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.name}
                </CustomLink>
              ))}
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            <ThemeToggle />
            <LocaleToggle />
            <UserAvatar />
          </div>
        </div>
      </div>
    </nav>
  )
}
