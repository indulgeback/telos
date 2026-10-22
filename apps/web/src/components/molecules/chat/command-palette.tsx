'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/atoms'
import { cn } from '@/lib/utils'

export interface ChatCommand {
  id: string
  /** 分组标题（同组连续渲染，组间加分隔线） */
  group: string
  /** 命令关键字（/ 后输入的过滤词），如 image/plan/think */
  keyword: string
  icon: ReactNode
  label: string
  description: string
  /** 当前是否处于激活状态（行尾显示对勾） */
  active?: boolean
  disabled?: boolean
}

interface CommandPaletteProps {
  input: string
  commands: ChatCommand[]
  onPick: (command: ChatCommand) => void
  registerControls?: (controls: {
    move: (direction: 'up' | 'down' | 'enter' | 'escape') => void
    isOpen: () => boolean
  }) => void
}

/**
 * DeepSeek 风格的 `/` 指令面板：输入框内容恰为 /[a-z0-9-]* 时弹出，
 * 分组展示 命令（图标 + 名称 + 关键字 + 右对齐描述），方向键导航 + 回车执行。
 * 收纳输入框工具栏里的模式开关与低频操作，是 `$` 技能面板的姊妹交互。
 */
export function CommandPalette({
  input,
  commands,
  onPick,
  registerControls,
}: CommandPaletteProps) {
  // 存选中命令 id 而非索引：过滤集变化时 findIndex 落空自然回到 0（顶部），
  // 避免用 effect 同步重置索引
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const triggerMatch = input.match(/^\/([a-z0-9-]*)$/i)
  const isOpen = triggerMatch !== null

  const query = triggerMatch?.[1]?.toLowerCase() ?? ''
  const filtered = commands.filter(command =>
    `${command.keyword} ${command.label}`.toLowerCase().includes(query)
  )

  const safeIndex = Math.max(
    0,
    filtered.findIndex(command => command.id === selectedId)
  )

  useEffect(() => {
    if (!registerControls) return
    registerControls({
      move: direction => {
        if (!isOpen || filtered.length === 0) return
        if (direction === 'up') {
          const next =
            safeIndex <= 0
              ? filtered.length - 1
              : Math.min(safeIndex - 1, filtered.length - 1)
          setSelectedId(filtered[next]?.id ?? null)
        } else if (direction === 'down') {
          const next = safeIndex >= filtered.length - 1 ? 0 : safeIndex + 1
          setSelectedId(filtered[next]?.id ?? null)
        } else if (direction === 'enter') {
          const picked = filtered[safeIndex]
          if (picked && !picked.disabled) onPick(picked)
        }
      },
      isOpen: () => isOpen,
    })
  }, [registerControls, isOpen, filtered, safeIndex, onPick])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-command-idx="${safeIndex}"]`
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [safeIndex])

  if (!isOpen) return null

  // 同 group 连续渲染：组前渲染标题行，组间加分隔线
  const rows: Array<
    | { kind: 'group'; label: string }
    | { kind: 'command'; command: ChatCommand; index: number }
  > = []
  filtered.forEach((command, index) => {
    const previous = rows[rows.length - 1]
    if (
      !previous ||
      previous.kind !== 'command' ||
      previous.command.group !== command.group
    ) {
      rows.push({ kind: 'group', label: command.group })
    }
    rows.push({ kind: 'command', command, index })
  })

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span className='invisible absolute' aria-hidden />
      </PopoverAnchor>
      <PopoverContent
        side='top'
        align='start'
        sideOffset={8}
        className='w-80 p-1'
        onOpenAutoFocus={e => e.preventDefault()}
      >
        {filtered.length === 0 ? null : (
          <div ref={listRef} className='max-h-64 overflow-y-auto'>
            {rows.map((row, rowIndex) => {
              if (row.kind === 'group') {
                return (
                  <div
                    key={`group-${row.label}-${rowIndex}`}
                    className='px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 first:pt-1.5'
                  >
                    {row.label}
                  </div>
                )
              }
              const { command, index } = row
              return (
                <button
                  key={command.id}
                  type='button'
                  data-command-idx={index}
                  disabled={command.disabled}
                  onMouseEnter={() => setSelectedId(command.id)}
                  onClick={() => onPick(command)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm',
                    index === safeIndex && !command.disabled
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                    command.disabled && 'cursor-not-allowed opacity-45'
                  )}
                >
                  <span className='grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground'>
                    {command.icon}
                  </span>
                  <span className='shrink-0'>{command.label}</span>
                  <span className='shrink-0 font-mono text-xs text-muted-foreground/80'>
                    {command.keyword}
                  </span>
                  <span className='line-clamp-1 min-w-0 flex-1 text-right text-xs text-muted-foreground'>
                    {command.description}
                  </span>
                  {command.active && (
                    <Check className='size-3.5 shrink-0 text-primary' />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
