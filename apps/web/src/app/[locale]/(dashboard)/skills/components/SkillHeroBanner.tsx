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
      imageSrc='/skills-hero-t.png'
      imagePosition='object-[72%_center] md:object-center'
      onAction={onExplore}
    />
  )
}
