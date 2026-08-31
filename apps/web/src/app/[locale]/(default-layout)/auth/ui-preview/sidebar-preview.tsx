'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LiquidOrbIcon } from '@/components/atoms'
import { AgentThreadSidebar } from '@/components/organisms/Chat/AgentThreadSidebar'
import { type AgentThread } from '@/service/agent'

const previewThreads: AgentThread[] = [
  'Current TTS model comparison',
  'Gemini image generation repair',
  'Agent SDK architecture notes',
  'Voice interaction polish',
  'Sidebar navigation redesign',
  'Production release checklist',
].map((title, index) => ({
  id: `preview-thread-${index}`,
  agent_id: 'preview-agent',
  title,
  status: 'active',
  created_at: new Date(2026, 7, 28 - index).toISOString(),
  updated_at: new Date(2026, 7, 28 - index).toISOString(),
}))

export function SidebarPreview() {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [currentThreadId, setCurrentThreadId] = useState(
    previewThreads[0]?.id ?? null
  )
  const filteredThreads = useMemo(
    () =>
      previewThreads.filter(thread =>
        thread.title.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )
  const handleAgentChange = useCallback(() => undefined, [])

  return (
    <div
      className={`h-[680px] overflow-hidden rounded-[28px] border border-border bg-card shadow-sm transition-[width] duration-300 ${
        collapsed ? 'w-14' : 'w-[286px]'
      }`}
    >
      <AgentThreadSidebar
        threads={previewThreads}
        filteredThreads={filteredThreads}
        currentThreadId={currentThreadId}
        threadsLoading={false}
        threadSearch={search}
        selectedAgentId={null}
        workspaceSwitcher={
          <button
            type='button'
            className='flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm font-medium text-foreground/80 hover:bg-muted/65'
          >
            <LiquidOrbIcon className='size-5 shrink-0' />
            <span className='min-w-0 flex-1 truncate text-left'>
              T workspace
            </span>
            <ChevronDown className='size-3.5 shrink-0 text-muted-foreground' />
          </button>
        }
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onSearchChange={setSearch}
        onAgentChange={handleAgentChange}
        onNewThread={() => undefined}
        onSelectThread={setCurrentThreadId}
        onRenameThread={() => undefined}
        onDeleteThread={() => undefined}
        labels={{
          title: 'Chats',
          newThread: 'New chat',
          search: 'Search chats...',
          empty: 'No chats yet',
          noResults: 'No chats found',
          rename: 'Rename',
          delete: 'Delete',
        }}
      />
    </div>
  )
}
