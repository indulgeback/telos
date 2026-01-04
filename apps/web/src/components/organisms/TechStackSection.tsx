'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { SectionWrapper, SectionTitle } from '@/components/molecules'

export function TechStackSection() {
  const t = useTranslations('HomePage')

  const techStacks = [
    {
      category: t('techStack.frontend.title'),
      items: [
        { name: 'Next.js 15', desc: t('techStack.frontend.nextjs') },
        { name: 'Shadcn UI', desc: t('techStack.frontend.shadcn') },
        { name: 'TypeScript', desc: t('techStack.frontend.typescript') },
        { name: 'tRPC', desc: t('techStack.frontend.trpc') },
        { name: 'Zustand', desc: t('techStack.frontend.zustand') },
      ],
    },
    {
      category: t('techStack.backend.title'),
      items: [
        { name: 'Go', desc: t('techStack.backend.go') },
        { name: 'Gin/Echo', desc: t('techStack.backend.gin') },
        { name: 'gRPC', desc: t('techStack.backend.grpc') },
        { name: 'PostgreSQL', desc: t('techStack.backend.postgresql') },
        { name: 'Redis', desc: t('techStack.backend.redis') },
      ],
    },
    {
      category: t('techStack.infrastructure.title'),
      items: [
        { name: 'Docker', desc: t('techStack.infrastructure.docker') },
        { name: 'Kubernetes', desc: t('techStack.infrastructure.kubernetes') },
        { name: 'Helm', desc: t('techStack.infrastructure.helm') },
        {
          name: 'Prometheus + Grafana',
          desc: t('techStack.infrastructure.monitoring'),
        },
        { name: 'Jaeger', desc: t('techStack.infrastructure.tracing') },
      ],
    },
  ]

  return (
    <SectionWrapper variant='muted'>
      <SectionTitle title={t('architecture.title')} />
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {techStacks.map((stack, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              duration: 0.7,
              delay: index * 0.15,
              ease: [0.33, 1, 0.68, 1],
            }}
            className='space-y-6'
          >
            <h3 className='text-xl font-body font-semibold text-foreground text-center mb-4'>
              {stack.category}
            </h3>
            <div className='space-y-4'>
              {stack.items.map((item, itemIndex) => (
                <motion.div
                  key={itemIndex}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1 + itemIndex * 0.05,
                  }}
                  className='p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors'
                >
                  <h4 className='font-mono font-medium text-foreground mb-1'>
                    {item.name}
                  </h4>
                  <p className='text-sm text-muted-foreground font-sans leading-relaxed'>
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}
