'use client'

import { useTranslations } from 'next-intl'
import { Code2, Server, Cloud, Zap, Globe } from 'lucide-react'
import {
  SectionWrapper,
  SectionTitle,
  FeatureCard,
} from '@/components/molecules'

export function FeaturesSection() {
  const t = useTranslations('HomePage')

  const features = [
    {
      icon: <Code2 className='h-6 w-6' />,
      title: t('features.frontend'),
      description: 'Next.js 15 + Shadcn UI',
    },
    {
      icon: <Server className='h-6 w-6' />,
      title: t('features.backend'),
      description: 'Go Microservices',
    },
    {
      icon: <Zap className='h-6 w-6' />,
      title: t('features.communication'),
      description: 'tRPC/gRPC',
    },
    {
      icon: <Globe className='h-6 w-6' />,
      title: t('features.monorepo'),
      description: 'Unified Management',
    },
    {
      icon: <Cloud className='h-6 w-6' />,
      title: t('features.deployment'),
      description: 'Docker + K8s',
    },
  ]

  return (
    <SectionWrapper variant='card'>
      <SectionTitle title={t('features.title')} />
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        {features.map((feature, index) => (
          <FeatureCard key={index} index={index} {...feature} />
        ))}
      </div>
    </SectionWrapper>
  )
}
