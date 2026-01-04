'use client'

import { useTranslations } from 'next-intl'
import { SectionWrapper, CTASection } from '@/components/molecules'

export function CTABannerSection() {
  const t = useTranslations('HomePage')

  return (
    <SectionWrapper>
      <CTASection
        title={t('cta.title') || '准备好开始了吗？'}
        description={
          t('cta.description') ||
          '立即体验 Telos 智能工作流编排平台，提升您的自动化效率'
        }
        primaryAction={{
          label: t('cta.getStarted') || '立即开始',
          href: '/auth/signin',
        }}
        secondaryAction={{
          label: t('cta.viewDocs') || '查看文档',
          href: '/docs',
        }}
        variant='gradient'
      />
    </SectionWrapper>
  )
}
