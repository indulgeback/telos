'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import {
  SectionWrapper,
  SectionTitle,
  StatCard,
  TestimonialCard,
  GradientBlob,
  CTASection,
} from '@/components/molecules'
import { testimonials } from '@/data'

export default function AboutPage() {
  const t = useTranslations('AboutPage')

  const stats = [
    { value: '2024', label: t('stats.founded') },
    { value: '18+', label: t('stats.languages') },
    { value: '5+', label: t('stats.services') },
    { value: '100%', label: t('stats.openSource') },
  ]

  return (
    <main className='pt-20'>
      {/* Hero */}
      <section className='relative py-20 px-4 overflow-hidden'>
        <GradientBlob color='secondary' size='lg' position='top-right' />
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
            className='text-xl text-muted-foreground max-w-2xl mx-auto'
          >
            {t('hero.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Mission */}
      <SectionWrapper variant='card'>
        <div className='max-w-3xl mx-auto text-center'>
          <SectionTitle title={t('mission.title')} />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-lg text-muted-foreground leading-relaxed'
          >
            {t('mission.content')}
          </motion.p>
        </div>
      </SectionWrapper>

      {/* Stats */}
      <SectionWrapper variant='muted'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
          {stats.map((stat, index) => (
            <StatCard key={index} index={index} {...stat} />
          ))}
        </div>
      </SectionWrapper>

      {/* Testimonials */}
      <SectionWrapper variant='card'>
        <SectionTitle
          title={t('testimonials.title')}
          subtitle={t('testimonials.subtitle')}
        />
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              index={index}
              quote={testimonial.quote}
              author={testimonial.name}
              role={testimonial.role}
              company={testimonial.company}
              avatar={`/assets/images/images/avatar/${testimonial.avatar}`}
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
          secondaryAction={{
            label: t('cta.secondary'),
            href: 'https://github.com/indulgeback/telos',
          }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
