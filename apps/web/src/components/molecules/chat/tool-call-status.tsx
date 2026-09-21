'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getToolKind,
  summarizeToolInput,
  summarizeToolResult,
} from '@/app/[locale]/(dashboard)/chat/chat-activity'

export interface ToolCallPreview {
  toolCallId: string
  toolName: string
  state: 'running' | 'success' | 'error'
  inputText?: string
  outputText?: string
  errorText?: string
}

function formatToolName(name: string) {
  return name.replace(/[_-]+/g, ' ').trim()
}

/**
 * 单个工具的一行式状态卡：
 * 状态图标 + 本地化动作摘要 + 截断的结果 chip，完整输入/输出收进展开抽屉。
 * 替换逻辑：准备调用 → 出现输入摘要 → 结果摘要原地替换。
 */
function ToolRow({ tool }: { tool: ToolCallPreview }) {
  const t = useTranslations('Chat')
  const [open, setOpen] = useState(false)
  const kind = getToolKind(tool.toolName)
  const target = summarizeToolInput(tool.inputText)
  const result = summarizeToolResult(tool.outputText, tool.errorText)

  const actionLabel = !target
    ? tool.state === 'running'
      ? t('toolCall.action.prepare')
      : formatToolName(tool.toolName)
    : kind === 'write'
      ? t('toolCall.action.write', { target })
      : kind === 'run'
        ? t('toolCall.action.run', { target })
        : kind === 'search'
          ? t('toolCall.action.search', { target })
          : t('toolCall.action.read', { target })

  const details: Array<{ label: string; text: string }> = []
  if (tool.inputText?.trim()) {
    details.push({ label: t('toolCall.input'), text: tool.inputText })
  }
  if (tool.outputText?.trim()) {
    details.push({ label: t('toolCall.output'), text: tool.outputText })
  }
  if (tool.errorText?.trim()) {
    details.push({ label: t('toolCall.error'), text: tool.errorText })
  }
  const hasDetails = details.length > 0

  return (
    <div className='min-w-0'>
      <button
        type='button'
        onClick={hasDetails ? () => setOpen(value => !value) : undefined}
        aria-expanded={hasDetails ? open : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors',
          hasDetails && 'cursor-pointer hover:bg-muted/50',
          !hasDetails && 'cursor-default'
        )}
      >
        {tool.state === 'running' ? (
          <Loader2 className='size-3.5 shrink-0 animate-spin text-primary' />
        ) : tool.state === 'error' ? (
          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-red-tint text-red'>
            <X className='size-2.5' />
          </span>
        ) : (
          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-green-tint text-green'>
            <Check className='size-2.5' />
          </span>
        )}
        <span className='min-w-0 flex-1 truncate text-[12px] text-ink-2'>
          {actionLabel}
        </span>
        {result && (
          <span
            className={cn(
              'max-w-[42%] shrink-0 truncate rounded-md bg-field px-1.5 py-0.5 font-mono text-[10.5px] leading-4',
              tool.state === 'error' ? 'text-red' : 'text-ink-3'
            )}
          >
            {result}
          </span>
        )}
        {hasDetails && (
          <ChevronDown
            className={cn(
              'size-3 shrink-0 text-muted-foreground/60 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        )}
      </button>
      {hasDetails && (
        <div
          className='grid transition-[grid-template-rows,opacity] duration-300'
          style={{
            gridTemplateRows: open ? '1fr' : '0fr',
            opacity: open ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <div className='overflow-hidden'>
            <div className='mb-1 ml-3 grid grid-cols-[14px_1fr] gap-1.5'>
              <span aria-hidden className='mx-auto h-full w-px bg-border' />
              <div className='flex flex-col gap-1.5 py-0.5'>
                {details.map(detail => (
                  <div key={detail.label} className='min-w-0'>
                    <p className='mb-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70'>
                      {detail.label}
                    </p>
                    <pre className='max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-field/70 px-2 py-1.5 font-mono text-[10.5px] leading-4 text-ink-2'>
                      {detail.text}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 连续工具调用的分组展示：
 * - 任一工具运行中 → 组实时展开，逐行可见
 * - 全部完成 → 收起为一行「N 次工具调用 · 全部成功/有失败」，点击再展开
 * - 单个工具 → 不渲染组头，只显示这一行
 */
export function ToolCallGroup({ tools }: { tools: ToolCallPreview[] }) {
  const t = useTranslations('Chat')
  const [groupOpen, setGroupOpen] = useState<boolean | null>(null)
  const anyRunning = tools.some(tool => tool.state === 'running')
  const hasFailure = tools.some(tool => tool.state === 'error')
  // 运行中默认展开；全部结束后默认收起；用户手动切换后以手动为准
  const expanded = groupOpen ?? anyRunning

  if (tools.length === 1) {
    const onlyTool = tools[0]
    return (
      <section className='beautiful-ui w-full py-0.5'>
        {onlyTool ? <ToolRow tool={onlyTool} /> : null}
      </section>
    )
  }

  return (
    <section className='beautiful-ui w-full py-0.5'>
      <button
        type='button'
        onClick={() => setGroupOpen(value => !(value ?? anyRunning))}
        aria-expanded={expanded}
        className='flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
      >
        {hasFailure ? (
          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-red-tint text-red'>
            <X className='size-2.5' />
          </span>
        ) : (
          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-green-tint text-green'>
            <Check className='size-2.5' />
          </span>
        )}
        <span className='min-w-0 flex-1 truncate text-[12px] text-muted-foreground'>
          {t('toolCall.group', { count: tools.length })}
          {!anyRunning && (
            <span className='text-muted-foreground/70'>
              {' · '}
              {hasFailure
                ? t('toolCall.groupHasFailure')
                : t('toolCall.groupAllSuccess')}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>
      <div
        className='grid transition-[grid-template-rows,opacity] duration-300'
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className='overflow-hidden'>
          <div className='mb-1 flex flex-col gap-0.5 py-0.5'>
            {tools.map(tool => (
              <ToolRow key={tool.toolCallId} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ToolCallStatus({ tool }: { tool: ToolCallPreview }) {
  return <ToolCallGroup tools={[tool]} />
}
