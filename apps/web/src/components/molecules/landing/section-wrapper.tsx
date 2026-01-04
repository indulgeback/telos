'use client'

import { motion, type Variants } from 'motion/react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface SectionWrapperProps {
  children: ReactNode
  className?: string
  id?: string
  variant?: 'default' | 'muted' | 'card' | 'secondary'
  animate?: boolean
}

const variants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: 0.1 } },
}

const bgVariants = {
  default: 'bg-background',
  muted: 'bg-muted/30',
  card: 'bg-card',
  secondary: 'bg-secondary',
}

export function SectionWrapper({
  children,
  className,
  id,
  variant = 'default',
  animate = true,
}: SectionWrapperProps) {
  const Comp = animate ? motion.section : 'section'
  const props = animate
    ? {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: { once: true, margin: '-100px' },
        variants,
      }
    : {}

  return (
    <Comp
      id={id}
      className={cn(
        'py-20 px-4 sm:px-6 lg:px-8',
        bgVariants[variant],
        className
      )}
      {...props}
    >
      <div className='max-w-7xl mx-auto'>{children}</div>
    </Comp>
  )
}
