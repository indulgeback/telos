'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUpRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WebSearchResultItem } from '@/app/[locale]/(dashboard)/chat/web-search-results'

/**
 * DeepSeek 风格的搜索来源面板：列出一次对话里搜索到的网页
 * （favicon + 来源域名 + 标题 + 摘要），点击条目新标签页打开。
 * 引用角标 [n] 点击时通过 highlightIndex 高亮对应条目。
 */
export function SearchResultsPanel({
  title,
  results,
  highlightIndex,
  onClose,
  className,
}: {
  title: string
  results: WebSearchResultItem[]
  highlightIndex?: number | null
  onClose: () => void
  className?: string
}) {
  const t = useTranslations('Chat')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (highlightIndex == null) return
    const node = listRef.current?.querySelector('[data-highlight="true"]')
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightIndex, results])

  return (
    <div
      className={cn('flex h-full min-h-0 flex-col bg-card/60', className)}
      data-testid='search-results-panel'
    >
      <div className='flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium'>
            {t('searchResults.panelTitle')}
          </p>
          <p
            className='mt-0.5 truncate text-xs text-muted-foreground'
            title={title}
          >
            {t('searchResults.count', { count: results.length })}
            {title ? ` · ${title}` : ''}
          </p>
        </div>
        <button
          type='button'
          onClick={onClose}
          aria-label={t('searchResults.close')}
          className='grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
        >
          <X className='size-4' />
        </button>
      </div>

      <div ref={listRef} className='min-h-0 flex-1 overflow-y-auto px-2 py-2'>
        {results.map(item => {
          const highlighted =
            highlightIndex != null && item.index === highlightIndex
          return (
            <button
              key={`${item.index}-${item.url}`}
              type='button'
              data-highlight={highlighted || undefined}
              onClick={() =>
                window.open(item.url, '_blank', 'noopener,noreferrer')
              }
              className={cn(
                'group mb-1 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60',
                highlighted && 'bg-primary/10 ring-1 ring-primary/30'
              )}
            >
              <span className='flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground'>
                {item.source
                  .replace(/^www\./, '')
                  .charAt(0)
                  .toUpperCase() || '?'}
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-[11px] text-muted-foreground'>
                  {item.source}
                </span>
                <span className='mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug group-hover:text-primary'>
                  {item.title}
                </span>
                {item.snippet && (
                  <span className='mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground'>
                    {item.snippet}
                  </span>
                )}
              </span>
              <ArrowUpRight className='mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
            </button>
          )
        })}
      </div>
    </div>
  )
}
