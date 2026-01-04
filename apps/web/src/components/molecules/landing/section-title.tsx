'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface SectionTitleProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

export function SectionTitle({
  title,
  subtitle,
  badge,
  align = 'center',
  className,
}: SectionTitleProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <div className={cn('mb-16', alignClass[align], className)}>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-4'
        >
          {badge}
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
        className='text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight'
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          className='mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto'
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}
