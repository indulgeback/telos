'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms'
import { Quote } from 'lucide-react'

interface TestimonialCardProps {
  quote: string
  author: string
  role: string
  company?: string
  avatar?: string
  index?: number
  className?: string
}

export function TestimonialCard({
  quote,
  author,
  role,
  company,
  avatar,
  index = 0,
  className,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.33, 1, 0.68, 1],
      }}
      className={cn(
        'p-6 rounded-xl border border-border bg-card relative',
        className
      )}
    >
      <Quote className='h-8 w-8 text-primary/20 absolute top-4 right-4' />
      <p className='text-foreground font-sans leading-relaxed mb-6 italic'>
        "{quote}"
      </p>
      <div className='flex items-center gap-3'>
        <Avatar className='h-10 w-10'>
          <AvatarImage src={avatar} alt={author} />
          <AvatarFallback className='bg-primary/10 text-primary'>
            {author.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className='font-body font-semibold text-foreground'>
            {author}
          </div>
          <div className='text-sm text-muted-foreground'>
            {role}
            {company && ` · ${company}`}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
