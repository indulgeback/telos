'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillHeroBannerProps {
  /** 技能总数(用于副标题里的计数) */
  totalCount: number
  /** 点击「探索全部」时滚到分类网格 / 列表区 */
  onExplore?: () => void
}

/**
 * 商店主视觉横幅 —— 编辑式排版 (serif display + sans body) 叠加在
 * 预生成背景图上。背景图主体在右侧,故文字内容左对齐至留白区;
 * 左侧叠一层从背景色到透明的渐变遮罩,保证浅色图上文字依旧可读。
 */
export function SkillHeroBanner({
  totalCount,
  onExplore,
}: SkillHeroBannerProps) {
  const t = useTranslations('Skill')

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] border border-border/60',
        'min-h-[200px] md:min-h-[240px]'
      )}
    >
      {/* 背景图(纯装饰,无需无障碍描述) */}
      <Image
        src='/skills-hero-bg.jpg'
        alt=''
        fill
        priority
        sizes='(max-width: 768px) 100vw, 80vw'
        className='-z-20 object-cover'
      />
      {/* 左侧渐变遮罩:从背景色过渡到透明,护住左侧文字可读性 */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10',
          'bg-gradient-to-r from-background via-background/85 to-transparent',
          'md:from-background md:via-background/70 md:to-transparent'
        )}
      />

      <div className='relative max-w-xl px-8 py-10 md:px-12 md:py-14'>
        <h1
          className={cn(
            'text-balance text-3xl font-medium leading-[1.15] tracking-tight md:text-[40px]',
            'font-display'
          )}
        >
          {t('hero.title')}
        </h1>

        <p className='mt-4 max-w-md text-pretty text-sm text-muted-foreground md:text-base'>
          {t('hero.subtitle', { count: totalCount })}
        </p>

        <div className='mt-7 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            onClick={onExplore}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5',
              'text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
            )}
          >
            {t('hero.cta')}
            <ArrowRight className='size-4' />
          </button>
        </div>
      </div>
    </section>
  )
}
