'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms'
import { ArrowRight } from 'lucide-react'
import { ReactNode } from 'react'

interface CTASectionProps {
  title: string
  description?: string
  primaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  children?: ReactNode
  className?: string
  variant?: 'default' | 'gradient'
}

export function CTASection({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
  className,
  variant = 'default',
}: CTASectionProps) {
  const bgClass =
    variant === 'gradient'
      ? 'bg-gradient-to-br from-primary/10 via-background to-accent/10'
      : 'bg-card'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
      className={cn(
        'rounded-2xl p-8 md:p-12 text-center border border-border',
        bgClass,
        className
      )}
    >
      <h3 className='text-2xl md:text-3xl font-display font-bold text-foreground mb-4'>
        {title}
      </h3>
      {description && (
        <p className='text-muted-foreground max-w-2xl mx-auto mb-8'>
          {description}
        </p>
      )}
      {children}
      {(primaryAction || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className='flex flex-col sm:flex-row gap-4 justify-center'
        >
          {primaryAction && (
            <Button
              size='lg'
              className='group font-body font-semibold'
              onClick={primaryAction.onClick}
              asChild={!!primaryAction.href}
            >
              {primaryAction.href ? (
                <a href={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                </a>
              ) : (
                <>
                  {primaryAction.label}
                  <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                </>
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size='lg'
              variant='outline'
              className='font-body font-medium'
              onClick={secondaryAction.onClick}
              asChild={!!secondaryAction.href}
            >
              {secondaryAction.href ? (
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              ) : (
                secondaryAction.label
              )}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
