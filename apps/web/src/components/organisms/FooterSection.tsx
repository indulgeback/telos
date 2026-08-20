'use client'

import { motion } from 'motion/react'
import { Link } from '@/i18n/navigation'
import { TelosLogo } from '@/components/atoms'

const footerGroups = [
  {
    title: 'Product',
    links: [
      ['Agents', '/agents'],
      ['Skills', '/skills'],
      ['Workflows', '/#use-cases'],
      ['Studio', '/#prompts'],
    ],
  },
  {
    title: 'Explore',
    links: [
      ['Overview', '/#overview'],
      ['Community', '/#blog'],
      ['Updates', '/#updates'],
      ['GitHub', 'https://github.com/indulgeback/telos'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Privacy', '/privacy-policy'],
      ['Terms', '/terms-of-service'],
    ],
  },
]

export function FooterSection() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
      className='border-t border-border bg-background py-14 sm:py-20'
    >
      <div className='mx-auto max-w-[1240px] px-4 sm:px-6'>
        <div className='grid gap-14 border-b border-border pb-14 sm:grid-cols-[1.3fr_2fr] sm:pb-20'>
          <div>
            <Link href='/' className='inline-flex'>
              <TelosLogo />
            </Link>
            <p className='mt-5 max-w-xs text-sm leading-6 text-muted-foreground'>
              A place for ideas, agents, context, and tools to become work that
              keeps moving.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-10 sm:grid-cols-3'>
            {footerGroups.map(group => (
              <div key={group.title}>
                <p className='text-xs font-medium uppercase tracking-[0.16em] text-foreground/45'>
                  {group.title}
                </p>
                <div className='mt-5 flex flex-col gap-3'>
                  {group.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className='text-sm text-muted-foreground transition-colors hover:text-foreground'
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className='flex flex-col gap-3 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
          <p>© 2026 Telos. Built with Next.js and Go.</p>
          <p>Purposeful agents for real work.</p>
        </div>
      </div>
    </motion.footer>
  )
}
