'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

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
    <details className='chat-tool-details text-xs text-muted-foreground [&_summary::-webkit-details-marker]:hidden'>
      <summary className='inline-flex cursor-pointer list-none items-center gap-2 rounded-md py-0.5 pr-2 transition-colors hover:text-foreground'>
        <ChevronRight className='chat-tool-chevron size-3.5' />
        <span className='inline-flex items-center gap-1.5 font-medium text-foreground/85'>
          <Wrench className='size-3.5 text-muted-foreground' />
          {formatToolName(tool.toolName)}
        </span>
        <span className='h-1 w-1 rounded-full bg-current opacity-35' />
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px]',
            meta.textClass
          )}
        >
          <Icon
            className={cn(
              'size-3.5',
              tool.state === 'running' && 'animate-spin'
            )}
          />
          {meta.label}
        </span>
      </summary>

      {(summaryInput || summaryOutput || summaryError) && (
        <div className='ml-[7px] mt-1 border-l border-border/70 pl-4 text-[11px] leading-relaxed'>
          {summaryInput && (
            <p className='line-clamp-1 text-muted-foreground'>
              {t('toolCall.input')}: {summaryInput}
            </p>
          )}
          {tool.state === 'success' && summaryOutput && (
            <p className='line-clamp-2 text-foreground/75'>
              {t('toolCall.output')}: {summaryOutput}
            </p>
          )}
          {tool.state === 'error' && summaryError && (
            <p className='line-clamp-2 text-destructive'>
              {t('toolCall.error')}: {summaryError}
            </p>
          )}
        </div>
      )}

      {hasDetail && (
        <div className='ml-[7px] mt-2 space-y-2 border-l border-border/70 pl-4'>
          {input && (
            <div>
              <p className='text-[11px] text-muted-foreground'>
                {t('toolCall.input')}
              </p>
              <pre className='mt-1 whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 text-[11px] text-foreground'>
                {input}
              </pre>
            </div>
          )}
          {tool.state === 'success' && output && (
            <div>
              <p className='text-[11px] text-muted-foreground'>
                {t('toolCall.output')}
              </p>
              <pre className='mt-1 whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 text-[11px] text-foreground'>
                {output}
              </pre>
            </div>
          )}
          {tool.state === 'error' && errorText && (
            <div>
              <p className='text-[11px] text-muted-foreground'>
                {t('toolCall.error')}
              </p>
              <pre className='mt-1 whitespace-pre-wrap break-words rounded-md bg-destructive/10 p-2 text-[11px] text-destructive'>
                {errorText}
              </pre>
            </div>
          )}
        </div>
      )}
    </details>
  )
}
