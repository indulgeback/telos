'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import {
  Code2,
  Server,
  Cloud,
  Zap,
  Globe,
  Shield,
  Cpu,
  Database,
  GitBranch,
  Layers,
} from 'lucide-react'
import {
  SectionWrapper,
  SectionTitle,
  FeatureCard,
  GradientBlob,
  CTASection,
} from '@/components/molecules'

export default function FeaturesPage() {
  const t = useTranslations('FeaturesPage')

  const coreFeatures = [
    {
      icon: <Code2 className='h-6 w-6' />,
      title: t('core.frontend.title'),
      description: t('core.frontend.desc'),
    },
    {
      icon: <Server className='h-6 w-6' />,
      title: t('core.backend.title'),
      description: t('core.backend.desc'),
    },
    {
      icon: <Zap className='h-6 w-6' />,
      title: t('core.communication.title'),
      description: t('core.communication.desc'),
    },
    {
      icon: <Globe className='h-6 w-6' />,
      title: t('core.i18n.title'),
      description: t('core.i18n.desc'),
    },
    {
      icon: <Cloud className='h-6 w-6' />,
      title: t('core.deployment.title'),
      description: t('core.deployment.desc'),
    },
    {
      icon: <GitBranch className='h-6 w-6' />,
      title: t('core.monorepo.title'),
      description: t('core.monorepo.desc'),
    },
  ]

  const advancedFeatures = [
    {
      icon: <Shield className='h-6 w-6' />,
      title: t('advanced.security.title'),
      description: t('advanced.security.desc'),
    },
    {
      icon: <Cpu className='h-6 w-6' />,
      title: t('advanced.ai.title'),
      description: t('advanced.ai.desc'),
    },
    {
      icon: <Database className='h-6 w-6' />,
      title: t('advanced.data.title'),
      description: t('advanced.data.desc'),
    },
    {
      icon: <Layers className='h-6 w-6' />,
      title: t('advanced.workflow.title'),
      description: t('advanced.workflow.desc'),
    },
  ]

  return (
    <main className='pt-20'>
      {/* Hero */}
      <section className='relative py-20 px-4 overflow-hidden'>
        <GradientBlob color='primary' size='lg' position='top-right' />
        <div className='max-w-4xl mx-auto text-center relative z-10'>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className='text-4xl md:text-5xl font-display font-bold text-foreground mb-6'
          >
            {t('hero.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className='text-xl text-muted-foreground'
          >
            {t('hero.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Core Features */}
      <SectionWrapper variant='card'>
        <SectionTitle title={t('core.title')} subtitle={t('core.subtitle')} />
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {coreFeatures.map((feature, index) => (
            <FeatureCard key={index} index={index} {...feature} />
          ))}
        </div>
      </SectionWrapper>

      {/* Advanced Features */}
      <SectionWrapper variant='muted'>
        <SectionTitle
          title={t('advanced.title')}
          subtitle={t('advanced.subtitle')}
        />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {advancedFeatures.map((feature, index) => (
            <FeatureCard
              key={index}
              index={index}
              variant='filled'
              {...feature}
            />
          ))}
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <CTASection
          title={t('cta.title')}
          description={t('cta.description')}
          primaryAction={{ label: t('cta.primary'), href: '/auth/signin' }}
          secondaryAction={{ label: t('cta.secondary'), href: '/docs' }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
