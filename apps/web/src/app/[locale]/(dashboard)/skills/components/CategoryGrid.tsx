'use client'

import { useTranslations } from 'next-intl'
import { SKILL_CATEGORIES } from './category'
import { cn } from '@/lib/utils'

interface CategoryGridProps {
  /** 每个分类的技能数量,key = category id,value = count */
  counts: Record<string, number>
  /** 当前选中的分类 (undefined = 未筛选) */
  active: string | undefined
  /** 选中分类时回调 */
  onSelect: (category: string | undefined) => void
}

/**
 * 分类网格 —— 对齐参考稿中央的「学习 / 写作 / 图片 / Slides / 网页 / 视频」网格。
 * 每张卡片:彩色 mist 图标 + 分类名 + 数量,点击即筛选商店列表。
 *
 * 「全部」卡片始终置顶,数量 = 所有技能之和;再次点击已选中分类会取消筛选。
 */
export function CategoryGrid({ counts, active, onSelect }: CategoryGridProps) {
  const t = useTranslations('Skill')

  return (
    <section>
      <div className='mb-4 flex items-baseline justify-between'>
        <h2 className='text-lg font-semibold tracking-tight'>
          {t('categories.title')}
        </h2>
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
        {SKILL_CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = active === cat.id
          const isAll = cat.id === 'all'
          // 「全部」的数量 = 所有分类求和;其余按 metadata 统计
          const count = isAll
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : (counts[cat.id] ?? 0)

          return (
            <button
              key={cat.id}
              type='button'
              onClick={() => onSelect(isActive ? undefined : cat.id)}
              className={cn(
                'group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all',
                'hover:-translate-y-0.5 hover:shadow-sm',
                isActive
                  ? 'border-foreground/30 bg-card shadow-sm ring-1 ring-foreground/10'
                  : 'border-border/60 bg-card/50 hover:border-border'
              )}
            >
              <div className='transition-transform group-hover:scale-105'>
                <Icon className={cn('size-6', cat.iconColor)} />
              </div>
              <div className='space-y-0.5'>
                <p className='text-sm font-medium leading-tight'>
                  {isAll ? t('store.categoryAll') : t(`category.${cat.id}`)}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {t('categories.count', { count })}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
