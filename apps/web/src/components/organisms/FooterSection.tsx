'use client'

import { motion } from 'motion/react'

export function FooterSection() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
      className='py-12 bg-secondary'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
        <p className='text-muted-foreground'>
          © 2024 Telos. Built with Next.js, Go, and ❤️
        </p>
      </div>
    </motion.footer>
  )
}
