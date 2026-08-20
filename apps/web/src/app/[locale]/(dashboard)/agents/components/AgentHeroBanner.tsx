'use client'

import { useTranslations } from 'next-intl'
import { TelosCollectionHero } from '@/components/molecules/telos-collection-hero'

interface AgentHeroBannerProps {
  onCreate?: () => void
}

export function AgentHeroBanner({ onCreate }: AgentHeroBannerProps) {
  const t = useTranslations('Agent')

  return (
    <TelosCollectionHero
      title={t('hero.title')}
      subtitle={t('hero.subtitle')}
      ctaLabel={t('hero.cta')}
      imageSrc='/agents-hero-t.png'
      imagePosition='object-[70%_center] md:object-center'
      onAction={onCreate}
    />
  )
}
