'use client'

import { useTranslations } from 'next-intl'
import ToolChips, { type ToolChipRow } from '@/components/primitives/ToolChips'

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

function normalizeText(input?: string) {
  if (!input) return ''
  return input.replace(/\s+/g, ' ').trim()
}

export function ToolCallGroup({ tools }: { tools: ToolCallPreview[] }) {
  const t = useTranslations('Chat')
  const rows: ToolChipRow[] = tools.map(tool => {
    const status =
      tool.state === 'success'
        ? t('toolCall.status.success')
        : tool.state === 'error'
          ? t('toolCall.status.error')
          : t('toolCall.status.running')
    const detail = [tool.inputText, tool.outputText, tool.errorText]
      .filter((value): value is string => Boolean(value))
      .map(text => ({ text }))
    const name = formatToolName(tool.toolName)
    const icon = /read|search|fetch|image/i.test(tool.toolName)
      ? 'read'
      : /write|edit|patch/i.test(tool.toolName)
        ? 'write'
        : /run|exec|command|test/i.test(tool.toolName)
          ? 'run'
          : 'think'

    return {
      id: tool.toolCallId,
      icon,
      label: name,
      chip: normalizeText(
        tool.errorText || tool.outputText || tool.inputText || status
      ),
      mono: true,
      detailMono: true,
      detail,
    }
  })

  return (
    <section className='beautiful-ui w-full py-1'>
      <ToolChips
        rows={rows}
        messagesCount={0}
        animate={false}
        showDiffs={false}
        live
      />
    </section>
  )
}

export function ToolCallStatus({ tool }: { tool: ToolCallPreview }) {
  return <ToolCallGroup tools={[tool]} />
}
