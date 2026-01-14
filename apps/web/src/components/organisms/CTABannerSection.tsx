'use client'

import { useTranslations } from 'next-intl'
import { SectionWrapper, CTASection } from '@/components/molecules'

export function CTABannerSection() {
  const t = useTranslations('HomePage')

  return (
    <SectionWrapper>
      <CTASection
        title={t('cta.title')}
        description={t('cta.description')}
        primaryAction={{
          label: t('cta.getStarted'),
          href: '/auth/signin',
        }}
        secondaryAction={{
          label: t('cta.viewDocs'),
          href: '/docs',
        }}
        variant='gradient'
      />
    </SectionWrapper>
  )
}
