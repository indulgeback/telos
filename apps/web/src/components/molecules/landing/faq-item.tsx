'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/atoms'

interface FAQItemProps {
  question: string
  answer: string
  value: string
  index?: number
  className?: string
}

export function FAQItem({
  question,
  answer,
  value,
  index = 0,
  className,
}: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <AccordionItem value={value} className={cn('border-border', className)}>
        <AccordionTrigger className='text-left font-body font-medium text-foreground hover:text-primary'>
          {question}
        </AccordionTrigger>
        <AccordionContent className='text-muted-foreground'>
          {answer}
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  )
}

interface FAQListProps {
  items: Array<{ question: string; answer: string }>
  className?: string
}

export function FAQList({ items, className }: FAQListProps) {
  return (
    <Accordion type='single' collapsible className={cn('w-full', className)}>
      {items.map((item, index) => (
        <FAQItem
          key={index}
          question={item.question}
          answer={item.answer}
          value={`item-${index}`}
          index={index}
        />
      ))}
    </Accordion>
  )
}
