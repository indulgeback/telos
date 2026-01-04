'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface LogoCloudProps {
  title?: string
  logos: Array<{
    name: string
    icon: ReactNode
  }>
  className?: string
}

export function LogoCloud({ title, logos, className }: LogoCloudProps) {
  return (
    <div className={cn('text-center', className)}>
      {title && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className='text-sm text-muted-foreground mb-8'
        >
          {title}
        </motion.p>
      )}
      <div className='flex flex-wrap justify-center items-center gap-8 md:gap-12'>
        {logos.map((logo, index) => (
          <motion.div
            key={logo.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            className='flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'
          >
            {logo.icon}
            <span className='font-mono text-sm'>{logo.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
