'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  index?: number
  className?: string
  variant?: 'default' | 'bordered' | 'filled'
}

export function FeatureCard({
  icon,
  title,
  description,
  index = 0,
  className,
  variant = 'bordered',
}: FeatureCardProps) {
  const variantStyles = {
    default: 'bg-transparent',
    bordered: 'border border-border bg-background hover:border-primary/30',
    filled: 'bg-card border border-border',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.33, 1, 0.68, 1],
      }}
      className={cn(
        'p-6 rounded-xl transition-all duration-300 hover:shadow-lg',
        variantStyles[variant],
        className
      )}
    >
      <div className='flex items-center mb-4'>
        <div className='p-2 rounded-lg bg-primary/10 text-primary'>{icon}</div>
      </div>
      <h3 className='text-lg font-body font-semibold text-foreground mb-2'>
        {title}
      </h3>
      <p className='text-muted-foreground font-sans leading-relaxed'>
        {description}
      </p>
    </motion.div>
  )
}
