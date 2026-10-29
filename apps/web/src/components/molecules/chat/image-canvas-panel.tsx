'use client'

import { useMemo, useState } from 'react'
import { Copy, ExternalLink, ImageIcon, PenLine, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImageCanvasItem {
  url: string
  /** 来源消息 id，用于滚动定位与去重提示 */
  messageId?: string
}

/**
 * 从助手消息 parts 里提取生成图 URL。
 * generate_image 的产物按工具约定以 markdown 图片（![...](url)）渲染在
 * 文本 part 中；input/file/image 类 part 复用既有图片提取。
 */
export function extractGeneratedImageUrls(
  messages: Array<{ id: string; role: string; parts?: unknown }>
): ImageCanvasItem[] {
  const items: ImageCanvasItem[] = []
  const seen = new Set<string>()
  const mdImage = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.parts)) continue
    for (const part of message.parts) {
      if (!part || typeof part !== 'object') continue
      const candidate = part as { type?: unknown; text?: unknown }
      if (candidate.type !== 'text' || typeof candidate.text !== 'string') {
        continue
      }
      for (const match of candidate.text.matchAll(mdImage)) {
        const url = match[1]
        if (seen.has(url)) continue
        seen.add(url)
        items.push({ url, messageId: message.id })
      }
    }
  }
  return items
}

interface ImageCanvasPanelProps {
  images: ImageCanvasItem[]
  onClose: () => void
  /** 以选中的图继续编辑：把图回传到输入框，进入图生图迭代 */
  onEditImage?: (url: string) => void
  title?: string
  emptyTitle?: string
  emptyHint?: string
  editLabel?: string
  copyLinkLabel?: string
  copiedLabel?: string
  openOriginalLabel?: string
  className?: string
}

/**
 * 图片画布：会话中生成的图片汇聚成可迭代的工作区。
 * 主图预览 + 缩略图列表 + 「以此图继续编辑」（图生图回传）。
 */
export function ImageCanvasPanel({
  images,
  onClose,
  onEditImage,
  title = '图片画布',
  emptyTitle = '还没有生成的图片',
  emptyHint = '让 T 画一张图，作品会自动出现在这里',
  editLabel = '以此图继续编辑',
  copyLinkLabel = '复制链接',
  copiedLabel = '已复制',
  openOriginalLabel = '查看原图',
  className,
}: ImageCanvasPanelProps) {
  const [selected, setSelected] = useState(0)
  const [copied, setCopied] = useState(false)

  // 列表收缩时渲染期钳制，不进 effect（避免级联重渲染）
  const activeIndex = Math.min(selected, Math.max(0, images.length - 1))
  const current = images[activeIndex]

  const previewList = useMemo(
    () =>
      images.map((image, index) => ({
        ...image,
        index,
        active: index === activeIndex,
      })),
    [images, activeIndex]
  )

  const copyLink = async () => {
    if (!current) return
    try {
      await navigator.clipboard.writeText(current.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div
      className={cn(
        'beautiful-ui flex h-full min-h-0 w-full flex-col',
        className
      )}
    >
      <div className='flex items-center gap-2 border-b border-border px-3 py-2.5'>
        <ImageIcon className='size-4 shrink-0 text-muted-foreground' />
        <p className='min-w-0 flex-1 truncate text-[13px] font-medium'>
          {title}
          {images.length > 0 && (
            <span className='ml-1.5 text-muted-foreground/70'>
              {images.length}
            </span>
          )}
        </p>
        <button
          type='button'
          onClick={onClose}
          aria-label='Close'
          className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <X className='size-4' />
        </button>
      </div>

      {images.length === 0 || !current ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center'>
          <ImageIcon className='size-8 text-muted-foreground/40' />
          <p className='text-[13px] text-muted-foreground'>{emptyTitle}</p>
          <p className='text-[12px] text-muted-foreground/70'>{emptyHint}</p>
        </div>
      ) : (
        <>
          <div className='relative bg-ink/90'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current.url}
              src={current.url}
              alt={title}
              className='mx-auto max-h-[46%] min-h-[180px] w-full object-contain'
            />
          </div>

          <div className='flex items-center gap-1.5 border-b border-border px-2.5 py-2'>
            {onEditImage && (
              <button
                type='button'
                onClick={() => onEditImage(current.url)}
                className='inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white transition-transform hover:-translate-y-px'
              >
                <PenLine className='size-3.5' />
                {editLabel}
              </button>
            )}
            <button
              type='button'
              onClick={copyLink}
              className='inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-muted'
            >
              <Copy className='size-3.5' />
              {copied ? copiedLabel : copyLinkLabel}
            </button>
            <a
              href={current.url}
              target='_blank'
              rel='noreferrer'
              aria-label={openOriginalLabel}
              title={openOriginalLabel}
              className='inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-muted'
            >
              <ExternalLink className='size-3.5' />
            </a>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-2.5 py-2'>
            <div className='grid grid-cols-2 gap-2'>
              {previewList.map(item => (
                <button
                  key={item.url}
                  type='button'
                  onClick={() => setSelected(item.index)}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border-2 transition-colors',
                    item.active
                      ? 'border-foreground'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`${title} ${item.index + 1}`}
                    loading='lazy'
                    className='aspect-square w-full object-cover'
                  />
                  <span className='absolute bottom-1 right-1 rounded bg-black/55 px-1.5 text-[10px] text-white'>
                    {item.index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
