import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/atoms', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
    children,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    children,
}))

vi.mock('./AgentSelector', () => ({
  AgentSelector: () => null,
}))

import { AgentThreadSidebar } from './AgentThreadSidebar'

const thread = {
  id: 'thread-1',
  agent_id: 'agent-1',
  title: 'A conversation that must stay hidden',
  status: 'active' as const,
  created_at: '2026-08-28T00:00:00.000Z',
  updated_at: '2026-08-28T00:00:00.000Z',
}

describe('AgentThreadSidebar', () => {
  it('does not render conversation shortcuts while collapsed', () => {
    const html = renderToStaticMarkup(
      <AgentThreadSidebar
        collapsed
        threads={[thread]}
        filteredThreads={[thread]}
        currentThreadId={thread.id}
        threadsLoading={false}
        threadSearch=''
        selectedAgentId={null}
        labels={{
          title: 'Chats',
          newThread: 'New chat',
          search: 'Search chats',
          empty: 'No chats',
          noResults: 'No results',
          rename: 'Rename',
          delete: 'Delete',
        }}
        onCollapsedChange={() => undefined}
        onSearchChange={() => undefined}
        onAgentChange={() => undefined}
        onNewThread={() => undefined}
        onSelectThread={() => undefined}
        onRenameThread={() => undefined}
        onDeleteThread={() => undefined}
      />
    )

    expect(html).toContain('aria-label="Workspace navigation"')
    expect(html).toContain('aria-label="Expand sidebar"')
    expect(html).toContain('>New chat<')
    expect(html).not.toContain('>Home<')
    expect(html).not.toContain('Invite users')
    expect(html).not.toContain(thread.title)
    expect(html).not.toContain('<nav')
  })

  it('keeps navigation actions available while expanded', () => {
    const html = renderToStaticMarkup(
      <AgentThreadSidebar
        threads={[thread]}
        filteredThreads={[thread]}
        currentThreadId={thread.id}
        threadsLoading={false}
        threadSearch=''
        selectedAgentId={null}
        labels={{
          title: 'Chats',
          newThread: 'New chat',
          search: 'Search chats',
          empty: 'No chats',
          noResults: 'No results',
          rename: 'Rename',
          delete: 'Delete',
        }}
        onCollapsedChange={() => undefined}
        onSearchChange={() => undefined}
        onAgentChange={() => undefined}
        onNewThread={() => undefined}
        onSelectThread={() => undefined}
        onRenameThread={() => undefined}
        onDeleteThread={() => undefined}
      />
    )

    expect(html).toContain('>New chat<')
    expect(html).toContain(thread.title)
  })
})
