'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import {
  SectionWrapper,
  SectionTitle,
  PricingCard,
  GradientBlob,
  FAQList,
} from '@/components/molecules'

export default function PricingPage() {
  const t = useTranslations('PricingPage')

  const plans = [
    {
      name: t('plans.free.name'),
      price: t('plans.free.price'),
      period: '',
      description: t('plans.free.description'),
      features: [
        t('plans.free.features.0'),
        t('plans.free.features.1'),
        t('plans.free.features.2'),
        t('plans.free.features.3'),
      ],
      cta: t('plans.free.cta'),
    },
    {
      name: t('plans.pro.name'),
      price: t('plans.pro.price'),
      period: t('plans.pro.period'),
      description: t('plans.pro.description'),
      features: [
        t('plans.pro.features.0'),
        t('plans.pro.features.1'),
        t('plans.pro.features.2'),
        t('plans.pro.features.3'),
        t('plans.pro.features.4'),
      ],
      cta: t('plans.pro.cta'),
      popular: true,
    },
    {
      name: t('plans.enterprise.name'),
      price: t('plans.enterprise.price'),
      period: '',
      description: t('plans.enterprise.description'),
      features: [
        t('plans.enterprise.features.0'),
        t('plans.enterprise.features.1'),
        t('plans.enterprise.features.2'),
        t('plans.enterprise.features.3'),
        t('plans.enterprise.features.4'),
      ],
      cta: t('plans.enterprise.cta'),
    },
  ]

  const faqs = [
    { question: t('faq.items.0.question'), answer: t('faq.items.0.answer') },
    { question: t('faq.items.1.question'), answer: t('faq.items.1.answer') },
    { question: t('faq.items.2.question'), answer: t('faq.items.2.answer') },
    { question: t('faq.items.3.question'), answer: t('faq.items.3.answer') },
  ]

  return (
    <main className='pt-20'>
      {/* Hero */}
      <section className='relative py-20 px-4 overflow-hidden'>
        <GradientBlob color='primary' size='lg' position='top-left' />
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

      {/* Pricing Cards */}
      <SectionWrapper variant='card'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 items-start'>
          {plans.map((plan, index) => (
            <PricingCard key={index} index={index} {...plan} />
          ))}
        </div>
      </SectionWrapper>

      {/* FAQ */}
      <SectionWrapper variant='muted'>
        <SectionTitle title={t('faq.title')} subtitle={t('faq.subtitle')} />
        <div className='max-w-3xl mx-auto'>
          <FAQList items={faqs} />
        </div>
      </SectionWrapper>
    </main>
  )
}
