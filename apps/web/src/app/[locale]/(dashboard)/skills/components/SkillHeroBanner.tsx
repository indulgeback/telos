'use client'

import { useTranslations } from 'next-intl'
import { TelosCollectionHero } from '@/components/molecules/telos-collection-hero'

interface SkillHeroBannerProps {
  /** 技能总数(用于副标题里的计数) */
  totalCount: number
  /** 点击「探索全部」时滚到分类网格 / 列表区 */
  onExplore?: () => void
}

export function SkillHeroBanner({
  totalCount,
  onExplore,
}: SkillHeroBannerProps) {
  const t = useTranslations('Skill')

  return (
    <TelosCollectionHero
      title={t('hero.title')}
      subtitle={t('hero.subtitle', { count: totalCount })}
      ctaLabel={t('hero.cta')}
      imageSrc='/brand/t-v4/gather.webp'
      imagePosition='!left-auto !w-[80%] object-[58%_20%] md:!w-[70%] md:object-[center_20%]'
      onAction={onExplore}
    />
  )
}
