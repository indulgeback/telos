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
        // 宽高比与背景图(2048×640 = 3.2:1)一致,保证图片完整展示不被裁剪;
        // 高度约视口 1/3,克制不喧宾夺主
        'aspect-[2048/640]'
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

      {/* 内容绝对定位,不再撑开容器高度 */}
      <div className='absolute inset-0 flex items-end pb-8 md:pb-12'>
        <div className='max-w-xl px-6 md:px-8'>
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
      </div>
    </section>
  )
}
