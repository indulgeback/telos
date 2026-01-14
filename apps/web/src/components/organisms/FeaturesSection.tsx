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
      description: t('featureDescriptions.frontend'),
    },
    {
      icon: <Server className='h-6 w-6' />,
      title: t('features.backend'),
      description: t('featureDescriptions.backend'),
    },
    {
      icon: <Zap className='h-6 w-6' />,
      title: t('features.communication'),
      description: t('featureDescriptions.communication'),
    },
    {
      icon: <Globe className='h-6 w-6' />,
      title: t('features.monorepo'),
      description: t('featureDescriptions.monorepo'),
    },
    {
      icon: <Cloud className='h-6 w-6' />,
      title: t('features.deployment'),
      description: t('featureDescriptions.deployment'),
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
