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
      imageSrc='/brand/t-v4/hero.webp'
      imagePosition='!left-auto !w-[80%] object-[58%_20%] md:!w-[70%] md:object-[center_20%]'
      onAction={onCreate}
    />
  )
}
