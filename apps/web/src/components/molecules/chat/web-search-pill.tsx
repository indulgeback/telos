'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WebSearchResultItem } from '@/app/[locale]/(dashboard)/chat/web-search-results'

function SourceFavicon({ item }: { item: WebSearchResultItem }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className='grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground'>
        {item.source
          .replace(/^www\./, '')
          .charAt(0)
          .toUpperCase() || '?'}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 远程站点 favicon 是任意域名的小图标，走 next/image 优化器没有意义
    <img
      src={`https://icons.duckduckgo.com/ip3/${item.source}.ico`}
      alt=''
      width={20}
      height={20}
      loading='lazy'
      onError={() => setFailed(true)}
      className='size-5 shrink-0 rounded-full bg-muted object-contain p-0.5'
    />
  )
}

/**
 * DeepSeek 风格的搜索引用胶囊：显示本条消息聚合的搜索结果数与来源 favicon，
 * 点击打开右侧来源面板。替代 web_search 工具的通用状态卡。
 */
export function WebSearchPill({
  results,
  onOpen,
  className,
}: {
  results: WebSearchResultItem[]
  onOpen: (results: WebSearchResultItem[]) => void
  className?: string
}) {
  const t = useTranslations('Chat')
  const sources = results.filter(
    (item, index, all) =>
      all.findIndex(other => other.source === item.source) === index
  )

  return (
    <button
      type='button'
      onClick={() => onOpen(results)}
      className={cn(
        'group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5',
        'text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:bg-accent/60 hover:text-foreground',
        className
      )}
    >
      <Search className='size-3.5 shrink-0' />
      <span className='shrink-0 font-medium'>
        {t('searchResults.count', { count: results.length })}
      </span>
      <span className='flex items-center -space-x-1.5'>
        {sources.slice(0, 4).map(item => (
          <span
            key={`${item.source}-${item.url}`}
            className='rounded-full ring-2 ring-card'
          >
            <SourceFavicon item={item} />
          </span>
        ))}
      </span>
      <ChevronRight className='size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5' />
    </button>
  )
}
