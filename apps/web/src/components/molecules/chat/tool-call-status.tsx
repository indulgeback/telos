'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToolCallPreview {
  toolCallId: string
  toolName: string
  state: 'running' | 'success' | 'error'
  inputText?: string
  outputText?: string
  errorText?: string
}

function getStateMeta(state: ToolCallPreview['state']) {
  switch (state) {
    case 'success':
      return {
        label: '完成',
        icon: CheckCircle2,
        textClass: 'text-emerald-600 dark:text-emerald-400',
      }
    case 'error':
      return {
        label: '失败',
        icon: AlertCircle,
        textClass: 'text-destructive',
      }
    default:
      return {
        label: '调用中',
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
  const [isExpanded, setIsExpanded] = useState(false)
  const meta = getStateMeta(tool.state)
  const Icon = meta.icon
  const input = tool.inputText ?? ''
  const output = tool.outputText ?? ''
  const errorText = tool.errorText ?? ''
  const summaryInput = compactText(input)
  const summaryOutput = compactText(output)
  const summaryError = compactText(errorText)
  const hasDetail = useMemo(() => {
    const values = [input, output, errorText].filter(Boolean)
    if (values.length === 0) return false
    return values.some(value => value.length > 90 || value.includes('\n'))
  }, [errorText, input, output])

  return (
    <div className='rounded-lg border border-border/60 bg-card/70 px-3 py-2 shadow-sm'>
      <div className='flex items-center gap-2 text-xs'>
        <Wrench className='size-3.5 text-muted-foreground' />
        <span className='font-medium text-foreground/90'>
          {formatToolName(tool.toolName)}
        </span>
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1',
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
      </div>

      {summaryInput && (
        <p className='mt-1 text-[11px] text-muted-foreground line-clamp-1'>
          输入：{summaryInput}
        </p>
      )}

      {tool.state === 'success' && summaryOutput && (
        <p className='mt-1 text-[11px] text-foreground/80 line-clamp-2'>
          输出：{summaryOutput}
        </p>
      )}

      {tool.state === 'error' && summaryError && (
        <p className='mt-1 text-[11px] text-destructive line-clamp-2'>
          错误：{summaryError}
        </p>
      )}

      {hasDetail && (
        <button
          type='button'
          onClick={() => setIsExpanded(prev => !prev)}
          className='mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors'
        >
          {isExpanded ? '收起详情' : '展开详情'}
        </button>
      )}

      {isExpanded && (
        <div className='mt-2 space-y-2 border-t border-border/60 pt-2'>
          {input && (
            <div>
              <p className='text-[11px] text-muted-foreground'>输入</p>
              <pre className='mt-1 whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 text-[11px] text-foreground'>
                {input}
              </pre>
            </div>
          )}
          {tool.state === 'success' && output && (
            <div>
              <p className='text-[11px] text-muted-foreground'>输出</p>
              <pre className='mt-1 whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 text-[11px] text-foreground'>
                {output}
              </pre>
            </div>
          )}
          {tool.state === 'error' && errorText && (
            <div>
              <p className='text-[11px] text-muted-foreground'>错误</p>
              <pre className='mt-1 whitespace-pre-wrap break-words rounded-md bg-destructive/10 p-2 text-[11px] text-destructive'>
                {errorText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
