'use client'

import { useTranslations } from 'next-intl'
import { Play, Server, Database, BookOpen, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/atoms'
import { SectionWrapper, SectionTitle } from '@/components/molecules'

export function QuickStartSection() {
  const t = useTranslations('HomePage')

  const steps = [
    {
      icon: <Play className='h-8 w-8 mx-auto mb-4 text-primary' />,
      title: t('quickStart.frontend'),
      code: 'pnpm dev',
    },
    {
      icon: <Server className='h-8 w-8 mx-auto mb-4 text-success' />,
      title: t('quickStart.backend'),
      code: 'go run main.go',
    },
    {
      icon: <Database className='h-8 w-8 mx-auto mb-4 text-warning' />,
      title: t('quickStart.database'),
      code: 'docker-compose up',
    },
  ]

  return (
    <SectionWrapper variant='card'>
      <div className='max-w-4xl mx-auto text-center'>
        <SectionTitle title={t('quickStart.title')} />
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.7,
                delay: i * 0.1,
                ease: [0.33, 1, 0.68, 1],
              }}
              className='p-6 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors'
            >
              {step.icon}
              <h3 className='font-body font-semibold text-foreground mb-2'>
                {step.title}
              </h3>
              <code className='text-sm bg-muted px-2 py-1 rounded font-mono text-foreground'>
                {step.code}
              </code>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            delay: 0.3,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className='flex flex-col sm:flex-row gap-4 justify-center'
        >
          <Button size='lg' variant='outline' className='font-body font-medium'>
            <BookOpen className='mr-2 h-4 w-4' />
            {t('cta.viewDocs')}
          </Button>
          <Button size='lg' className='font-body font-semibold'>
            {t('cta.learnMore')}
            <ArrowRight className='ml-2 h-4 w-4' />
          </Button>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
