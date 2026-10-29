'use client'

import { ImageIcon, MessageSquare, PenLine, Send, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { type ThreadImageComment } from '@/service/agent'
import { cn } from '@/lib/utils'

export { ImageCanvasContext } from './markdown-content'

export interface CanvasImage {
  url: string
  created_at?: string | null
  comments?: ThreadImageComment[] | null
}

interface ImageCanvasPanelProps {
  images: CanvasImage[]
  selectedUrl: string | null
  onSelect: (url: string) => void
  onClose: () => void
  /** 设为输入参数：把图放进输入框作为图生图入参 */
  onUseAsInput: (url: string) => void
  /** 提交评论（落库） */
  onAddComment: (url: string, text: string) => Promise<void>
  /** 按评论确定生成：图 + 评论内容一起作为输入触发新一轮生成 */
  onGenerateFromComments: (url: string, promptText: string) => void
  className?: string
}

function formatDay(iso: string | null | undefined, liveLabel: string) {
  if (!iso) return liveLabel
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return liveLabel
  const now = new Date()
  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (date.toDateString() === now.toDateString()) return `今天 ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

/**
 * 图片画布：会话中生成的图片按时间分组，选中即锁定为图生图输入，
 * 支持钉住图片追加评论、按评论一键生成。
 */
export function ImageCanvasPanel({
  images,
  selectedUrl,
  onSelect,
  onClose,
  onUseAsInput,
  onAddComment,
  onGenerateFromComments,
  className,
}: ImageCanvasPanelProps) {
  const t = useTranslations('Chat')
  const [commentTarget, setCommentTarget] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, CanvasImage[]>()
    for (const image of images) {
      const key = formatDay(image.created_at, t('imageCanvas.groupLive'))
      const bucket = map.get(key) ?? []
      bucket.push(image)
      map.set(key, bucket)
    }
    return [...map.entries()]
  }, [images])

  const selected = images.find(image => image.url === selectedUrl) ?? null

  const submitComment = async () => {
    const text = commentDraft.trim()
    if (!commentTarget || !text || submitting) return
    setSubmitting(true)
    try {
      await onAddComment(commentTarget, text)
      setCommentDraft('')
    } finally {
      setSubmitting(false)
    }
  }

  const generateFromComments = (url: string) => {
    const image = images.find(item => item.url === url)
    const lines = (image?.comments ?? [])
      .map((comment, index) => `${index + 1}. ${comment.text}`)
      .join('\n')
    if (!lines) {
      onUseAsInput(url)
      return
    }
    onGenerateFromComments(url, `基于这张图做以下修改：\n${lines}`)
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
          {t('imageCanvas.title')}
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

      {images.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center'>
          <ImageIcon className='size-8 text-muted-foreground/40' />
          <p className='text-[13px] text-muted-foreground'>
            {t('imageCanvas.empty')}
          </p>
          <p className='text-[12px] text-muted-foreground/70'>
            {t('imageCanvas.emptyHint')}
          </p>
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-y-auto px-3 py-3'>
          {groups.map(([dayLabel, dayImages]) => (
            <div key={dayLabel} className='mb-5'>
              <p className='mb-2 text-[11px] text-muted-foreground/70'>
                {dayLabel}
              </p>
              <div className='flex flex-col gap-3'>
                {dayImages.map(image => {
                  const active = image.url === selectedUrl
                  const commentCount = image.comments?.length ?? 0
                  const showComments = active && commentCount > 0
                  return (
                    <div key={image.url}>
                      <button
                        type='button'
                        onClick={() => onSelect(image.url)}
                        className={cn(
                          'block w-full overflow-hidden rounded-xl border-2 transition-colors',
                          active
                            ? 'border-primary'
                            : 'border-transparent hover:border-border'
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- COS 签名 URL 有时效,不适用 next/image */}
                        <img
                          src={image.url}
                          alt={t('imageCanvas.title')}
                          loading='lazy'
                          className='aspect-[4/3] w-full object-cover'
                        />
                      </button>

                      {active && (
                        <div className='mt-1.5 rounded-xl border border-border bg-background/70 p-1.5'>
                          <div className='flex items-center gap-1'>
                            <button
                              type='button'
                              onClick={() =>
                                setCommentTarget(
                                  commentTarget === image.url ? null : image.url
                                )
                              }
                              className={cn(
                                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-muted',
                                commentTarget === image.url &&
                                  'bg-muted text-foreground'
                              )}
                            >
                              <MessageSquare className='size-3.5' />
                              {t('imageCanvas.comment')}
                              {commentCount > 0 && (
                                <span className='grid size-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-white'>
                                  {commentCount}
                                </span>
                              )}
                            </button>
                            <button
                              type='button'
                              onClick={() => onUseAsInput(image.url)}
                              className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-muted'
                            >
                              <PenLine className='size-3.5' />
                              {t('imageCanvas.setAsInput')}
                            </button>
                            <button
                              type='button'
                              onClick={() => generateFromComments(image.url)}
                              className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-2 py-1.5 text-[12px] font-medium text-white transition-transform hover:-translate-y-px'
                            >
                              <Send className='size-3.5' />
                              {t('imageCanvas.generate')}
                            </button>
                          </div>

                          {showComments && (
                            <div className='mt-1.5 flex flex-col gap-1 px-1 pb-1'>
                              {image.comments!.map(comment => (
                                <div
                                  key={comment.id}
                                  className='rounded-lg bg-muted/60 px-2 py-1.5 text-[12px] leading-5 text-ink-2'
                                >
                                  {comment.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {commentTarget === image.url && (
                        <div className='mt-1.5 flex items-center gap-1.5 rounded-full border border-border bg-background p-1 pl-3'>
                          <input
                            value={commentDraft}
                            onChange={event =>
                              setCommentDraft(event.target.value)
                            }
                            onKeyDown={event => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void submitComment()
                              }
                            }}
                            placeholder={t('imageCanvas.commentPlaceholder')}
                            autoFocus
                            className='min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60'
                          />
                          <button
                            type='button'
                            onClick={() => void submitComment()}
                            disabled={!commentDraft.trim() || submitting}
                            className='grid size-7 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-40'
                            aria-label='提交评论'
                          >
                            {submitting ? '…' : <Send className='size-3.5' />}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** 图上悬浮的「画布」入口按钮（聊天里的生成图） */
export function CanvasEntryButton({
  onClick,
  label,
}: {
  onClick: () => void
  label?: string
}) {
  const t = useTranslations('Chat')
  const text = label ?? t('imageCanvas.open')
  return (
    <button
      type='button'
      onClick={event => {
        event.stopPropagation()
        event.preventDefault()
        onClick()
      }}
      className='absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-[12px] text-white backdrop-blur-sm transition-colors hover:bg-black/85'
    >
      <ImageIcon className='size-3.5' />
      {text}
    </button>
  )
}
