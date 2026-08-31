'use client'

import { type ReactNode } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import SidebarNav, {
  type SidebarRecent,
} from '@/components/primitives/SidebarNav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms'
import { type Agent, type AgentThread } from '@/service/agent'
import { cn } from '@/lib/utils'
import { AgentSelector } from './AgentSelector'

export interface AgentThreadSidebarLabels {
  title: string
  newThread: string
  search: string
  empty: string
  noResults: string
  rename: string
  delete: string
}

export interface AgentThreadSidebarProps {
  threads: AgentThread[]
  filteredThreads: AgentThread[]
  currentThreadId: string | null
  threadsLoading: boolean
  threadSearch: string
  selectedAgentId: string | null
  workspaceSwitcher?: ReactNode
  labels: AgentThreadSidebarLabels
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  onSearchChange: (value: string) => void
  onAgentChange: (agent: Agent) => void
  onNewThread: () => void
  onSelectThread: (threadId: string) => void
  onRenameThread: (thread: AgentThread) => void
  onDeleteThread: (thread: AgentThread) => void
  getThreadTitle?: (thread: AgentThread) => string
  className?: string
}

export function AgentThreadSidebar({
  threads,
  currentThreadId,
  selectedAgentId,
  workspaceSwitcher,
  labels,
  collapsed = false,
  onCollapsedChange,
  onAgentChange,
  onNewThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
  getThreadTitle = thread => thread.title,
  className,
}: AgentThreadSidebarProps) {
  const activeThread = threads.find(thread => thread.id === currentThreadId)
  const recents: SidebarRecent[] = threads.map(thread => {
    const label = getThreadTitle(thread)
    return {
      id: thread.id,
      label,
      actions: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              onClick={event => event.stopPropagation()}
              className='flex size-6 items-center justify-center rounded-[6px] text-ink-3 opacity-0 transition-[opacity,background-color,color] hover:bg-hover group-hover/glide:opacity-100 focus:opacity-100'
              aria-label={`${labels.rename} / ${labels.delete}`}
            >
              <MoreHorizontal className='size-3.5' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-32 rounded-xl'>
            <DropdownMenuItem
              onClick={event => {
                event.stopPropagation()
                onRenameThread(thread)
              }}
              className='rounded-lg text-xs'
            >
              <Pencil className='mr-2 size-3.5' />
              {labels.rename}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={event => {
                event.stopPropagation()
                onDeleteThread(thread)
              }}
              className='rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive'
            >
              <Trash2 className='mr-2 size-3.5' />
              {labels.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }
  })

  const workspaceControl = workspaceSwitcher ?? (
    <AgentSelector
      selectedAgentId={selectedAgentId}
      onAgentChange={onAgentChange}
      className='h-8 min-w-0 flex-1 rounded-[8px] bg-transparent px-2 text-[14px] font-medium text-ink-2 shadow-none hover:bg-hover-2'
    />
  )

  return (
    <SidebarNav
      fill
      className={cn('beautiful-ui h-full bg-surface py-2', className)}
      activeTitle={activeThread ? getThreadTitle(activeThread) : null}
      recents={collapsed ? [] : recents}
      collapsed={collapsed}
      collapsedMode='actions-only'
      onCollapsedChange={onCollapsedChange}
      workspaceControl={workspaceControl}
      newChatLabel={labels.newThread}
      chatsLabel={labels.title}
      searchLabel={labels.search}
      emptyLabel={labels.empty}
      showPrimaryNav={false}
      showFooter={false}
      onNewChat={onNewThread}
      onPick={id => onSelectThread(id)}
    />
  )
}
