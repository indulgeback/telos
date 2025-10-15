'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Blog', href: '/blog' },
  { name: 'Terms of Service', href: '/terms-of-service' },
  { name: 'Privacy Policy', href: '/privacy-policy' },
]

export function MdxHeader() {
  const pathname = usePathname()

  // 移除 locale 前缀来匹配路径
  const currentPath = pathname?.replace(/^\/[a-z]{2}/, '') || ''

  return (
    <header className='mdx-header'>
      <div className='mdx-header-container'>
        <Link href='/' className='mdx-header-logo'>
          <span className='mdx-header-logo-text'>Telos</span>
        </Link>

        <nav className='mdx-header-nav'>
          {navItems.map(item => {
            const isActive = currentPath.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mdx-header-nav-item ${isActive ? 'mdx-header-nav-item-active' : ''}`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
