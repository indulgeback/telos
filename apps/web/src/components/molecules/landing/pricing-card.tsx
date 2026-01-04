'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Button, Badge } from '@/components/atoms'
import { Check } from 'lucide-react'

interface PricingCardProps {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  popular?: boolean
  index?: number
  className?: string
  onSelect?: () => void
}

export function PricingCard({
  name,
  price,
  period = '/月',
  description,
  features,
  cta,
  popular = false,
  index = 0,
  className,
  onSelect,
}: PricingCardProps) {
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
        'relative p-6 rounded-xl border bg-card flex flex-col',
        popular ? 'border-primary shadow-lg scale-105' : 'border-border',
        className
      )}
    >
      {popular && (
        <Badge className='absolute -top-3 left-1/2 -translate-x-1/2'>
          最受欢迎
        </Badge>
      )}
      <div className='mb-6'>
        <h3 className='text-xl font-body font-semibold text-foreground mb-2'>
          {name}
        </h3>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>
      <div className='mb-6'>
        <span className='text-4xl font-display font-bold text-foreground'>
          {price}
        </span>
        <span className='text-muted-foreground'>{period}</span>
      </div>
      <ul className='space-y-3 mb-8 flex-1'>
        {features.map((feature, i) => (
          <li key={i} className='flex items-center gap-2 text-sm'>
            <Check className='h-4 w-4 text-primary flex-shrink-0' />
            <span className='text-muted-foreground'>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className='w-full'
        variant={popular ? 'default' : 'outline'}
        onClick={onSelect}
      >
        {cta}
      </Button>
    </motion.div>
  )
}
