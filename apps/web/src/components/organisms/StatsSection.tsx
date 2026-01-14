'use client'

import { useTranslations } from 'next-intl'
import { SectionWrapper, StatCard } from '@/components/molecules'

export function StatsSection() {
  const t = useTranslations('HomePage')

  const stats = [
    { value: '18+', label: t('stats.languages') },
    { value: '5+', label: t('stats.services') },
    { value: '99.9%', label: t('stats.uptime') },
    { value: '< 100ms', label: t('stats.latency') },
  ]

  return (
    <SectionWrapper variant='muted'>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
        {stats.map((stat, index) => (
          <StatCard key={index} index={index} {...stat} />
        ))}
      </div>
    </SectionWrapper>
  )
}
