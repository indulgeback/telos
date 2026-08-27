'use client'

import { AlertCircle, CheckCircle2, Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export interface ToolCallPreview {
  toolCallId: string
  toolName: string
  state: 'running' | 'success' | 'error'
  inputText?: string
  outputText?: string
  errorText?: string
}

function getStateMeta(state: ToolCallPreview['state'], t: any) {
  switch (state) {
    case 'success':
      return {
        label: t('toolCall.status.success'),
        icon: CheckCircle2,
        textClass: 'text-emerald-600 dark:text-emerald-400',
      }
    case 'error':
      return {
        label: t('toolCall.status.error'),
        icon: AlertCircle,
        textClass: 'text-destructive',
      }
    default:
      return {
        label: t('toolCall.status.running'),
        icon: Loader2,
        textClass: 'text-muted-foreground',
      }
  }
}

function formatToolName(name: string) {
  return name.replace(/[_-]+/g, ' ').trim()
}

function compactText(input?: string) {
  if (!input) return ''
  const normalized = input.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 90) return normalized
  return `${normalized.slice(0, 87)}...`
}

export function ToolCallStatus({ tool }: { tool: ToolCallPreview }) {
  const t = useTranslations('Chat')
  const [open, setOpen] = useState(false)
  const meta = getStateMeta(tool.state, t)
  const Icon = meta.icon
  const input = tool.inputText ?? ''
  const output = tool.outputText ?? ''
  const errorText = tool.errorText ?? ''
  const summaryInput = compactText(input)
  const summaryOutput = compactText(output)
  const summaryError = compactText(errorText)
  const hasDetail = Boolean(input || output || errorText)

  return (
    <section className='w-full'>
      <button
        type='button'
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className={cn(
          'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-all duration-200 active:scale-[0.98]',
          open
            ? 'border-primary/45 bg-accent text-accent-foreground'
            : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/45 hover:text-foreground'
        )}
      >
        <Icon
          className={cn(
            'size-3.5 shrink-0',
            tool.state === 'running' && 'animate-spin',
            meta.textClass
          )}
        />
        <span className='truncate font-medium'>
          {formatToolName(tool.toolName)}
        </span>
        <span className='font-mono text-[10px] text-muted-foreground/75'>
          {meta.label}
        </span>
      </button>

      {open && hasDetail && (
        <div className='agent-surface-shadow mt-2 overflow-hidden rounded-xl border border-border bg-card text-xs'>
          <div className='flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5'>
            <span className='inline-flex min-w-0 items-center gap-2 font-mono text-[11px] text-foreground'>
              <Wrench className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='truncate'>{tool.toolName}</span>
            </span>
            <span
              className={cn('shrink-0 font-mono text-[10px]', meta.textClass)}
            >
              {meta.label}
            </span>
          </div>
          <div className='space-y-3 px-3.5 py-3'>
            {input && (
              <div>
                <p className='font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground'>
                  {t('toolCall.input')}
                </p>
                <pre className='mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 font-mono text-[11px] leading-5 text-foreground/80'>
                  {input}
                </pre>
              </div>
            )}
            {tool.state === 'success' && output && (
              <div>
                <p className='font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground'>
                  {t('toolCall.output')}
                </p>
                <p className='mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-5 text-foreground/80'>
                  {output}
                </p>
              </div>
            )}
            {tool.state === 'error' && errorText && (
              <div>
                <p className='font-mono text-[10px] uppercase tracking-[0.12em] text-destructive'>
                  {t('toolCall.error')}
                </p>
                <p className='mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'>
                  {errorText}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!open && (summaryInput || summaryOutput || summaryError) && (
        <p
          className={cn(
            'mt-1.5 line-clamp-1 pl-2 text-[11px] leading-relaxed text-muted-foreground',
            tool.state === 'error' && 'text-destructive'
          )}
        >
          {summaryError || summaryOutput || summaryInput}
        </p>
      )}
    </section>
  )
}
