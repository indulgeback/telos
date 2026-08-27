'use client'

import {
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
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
  filteredThreads,
  currentThreadId,
  threadsLoading,
  threadSearch,
  selectedAgentId,
  labels,
  collapsed = false,
  onCollapsedChange,
  onSearchChange,
  onAgentChange,
  onNewThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
  getThreadTitle = thread => thread.title,
  className,
}: AgentThreadSidebarProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col bg-card/72 backdrop-blur-xl',
        className
      )}
    >
      <div className='p-2.5'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onNewThread}
            className={cn(
              'flex h-9 items-center rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]',
              collapsed
                ? 'w-9 justify-center'
                : 'min-w-0 flex-1 justify-start gap-2 px-3'
            )}
            aria-label={labels.newThread}
            title={collapsed ? labels.newThread : undefined}
          >
            <Plus className='size-4 shrink-0' />
            {!collapsed && (
              <span className='truncate text-[12px] font-medium'>
                {labels.newThread}
              </span>
            )}
          </button>
          {!collapsed && onCollapsedChange && (
            <button
              type='button'
              onClick={() => onCollapsedChange(true)}
              className='grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              aria-label={labels.title}
            >
              <PanelLeftClose className='size-4' />
            </button>
          )}
        </div>

        {collapsed ? (
          onCollapsedChange && (
            <button
              type='button'
              onClick={() => onCollapsedChange(false)}
              className='mt-2 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              aria-label={labels.title}
            >
              <PanelLeftOpen className='size-4' />
            </button>
          )
        ) : (
          <>
            <div className='mt-2'>
              <AgentSelector
                selectedAgentId={selectedAgentId}
                onAgentChange={onAgentChange}
              />
            </div>
            <label className='mt-2.5 flex h-9 items-center gap-2 rounded-lg bg-muted px-2.5 text-xs text-muted-foreground transition-colors focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/35'>
              <Search className='size-3.5 shrink-0' />
              <input
                value={threadSearch}
                onChange={event => onSearchChange(event.target.value)}
                placeholder={labels.search}
                className='min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70'
              />
              {threadSearch && (
                <span className='font-mono text-[9px] text-muted-foreground'>
                  {filteredThreads.length}
                </span>
              )}
            </label>
          </>
        )}
      </div>

      <div className='mx-2.5 border-t border-border' />

      <div className='min-h-0 flex-1 overflow-y-auto p-2'>
        {threadsLoading && threads.length === 0 ? (
          <div className='space-y-2 px-1 py-2' aria-label={labels.title}>
            {[0, 1, 2, 3, 4].map(index => (
              <div
                key={index}
                className={cn(
                  'relative h-9 overflow-hidden rounded-lg bg-muted',
                  collapsed ? 'w-9' : 'w-full'
                )}
              >
                <span
                  className='absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-card to-transparent'
                  style={{
                    animation: `agent-loading-sweep 1.5s ease-in-out ${index * 90}ms infinite`,
                  }}
                />
              </div>
            ))}
          </div>
        ) : filteredThreads.length === 0 ? (
          collapsed ? (
            <div className='grid size-9 place-items-center text-muted-foreground/50'>
              <MessageSquare className='size-4' />
            </div>
          ) : (
            <div className='px-3 py-8 text-center'>
              <span className='mx-auto grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground'>
                <MessageSquare className='size-4' />
              </span>
              <p className='mt-2 text-xs leading-5 text-muted-foreground'>
                {threads.length === 0 ? labels.empty : labels.noResults}
              </p>
            </div>
          )
        ) : (
          <nav aria-label={labels.title}>
            {!collapsed && (
              <p className='px-2 pb-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground'>
                {labels.title}
              </p>
            )}
            <div className='space-y-0.5'>
              {filteredThreads.map(thread => {
                const active = thread.id === currentThreadId
                const displayTitle = getThreadTitle(thread)
                return (
                  <div
                    key={thread.id}
                    className={cn(
                      'group flex min-h-9 items-center rounded-lg transition-colors duration-200',
                      collapsed ? 'justify-center px-0' : 'gap-1 px-2',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <button
                      type='button'
                      className={cn(
                        'flex h-9 min-w-0 items-center text-left',
                        collapsed ? 'w-9 justify-center' : 'flex-1 gap-2'
                      )}
                      onClick={() => onSelectThread(thread.id)}
                      title={collapsed ? displayTitle : undefined}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full transition-colors',
                          active
                            ? 'bg-primary'
                            : 'bg-border group-hover:bg-primary'
                        )}
                      />
                      {!collapsed && (
                        <span className='truncate text-[12px]'>
                          {displayTitle}
                        </span>
                      )}
                    </button>
                    {!collapsed && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type='button'
                            onClick={event => event.stopPropagation()}
                            className='grid size-7 shrink-0 place-items-center rounded-md opacity-0 transition-all hover:bg-card/75 group-hover:opacity-100 group-focus-within:opacity-100'
                            aria-label={`${labels.rename} / ${labels.delete}`}
                          >
                            <MoreHorizontal className='size-3.5' />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align='end'
                          className='w-32 rounded-xl'
                        >
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
                    )}
                  </div>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
