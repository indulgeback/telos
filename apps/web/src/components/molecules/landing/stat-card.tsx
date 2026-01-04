'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  value: string
  label: string
  index?: number
  className?: string
}

export function StatCard({
  value,
  label,
  index = 0,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={cn('text-center p-6', className)}
    >
      <div className='text-4xl md:text-5xl font-display font-bold text-primary mb-2'>
        {value}
      </div>
      <div className='text-muted-foreground font-sans'>{label}</div>
    </motion.div>
  )
}
