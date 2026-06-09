'use client'

import { motion } from 'motion/react'
import { Link } from '@/i18n/navigation'

export function FooterSection() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
      className='border-t border-border bg-background py-10'
    >
      <div className='mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8'>
        <p>© 2026 Telos. Built with Next.js and Go.</p>
        <div className='flex gap-4'>
          <Link href='/privacy-policy' className='hover:text-foreground'>
            Privacy
          </Link>
          <Link href='/terms-of-service' className='hover:text-foreground'>
            Terms
          </Link>
        </div>
      </div>
    </motion.footer>
  )
}
