import { notFound } from 'next/navigation'
import { AgentLoadingState } from '@/components/molecules/chat/agent-loading-state'
import { ClarifyPanel } from '@/components/molecules/chat/ClarifyPanel'
import { ToolCallGroup } from '@/components/molecules/chat/tool-call-status'
import { PlanStatePreview } from './plan-state-preview'
import { SidebarPreview } from './sidebar-preview'
import { StreamStabilityPreview } from './stream-stability-preview'

export default function AgentUiPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16'>
      <section className='space-y-3'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'>
          Sidebar navigation
        </p>
        <SidebarPreview />
      </section>

      <section className='space-y-3'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'>
          Loading state
        </p>
        <div className='flex max-w-xl items-start gap-4 py-3'>
          <span className='mt-0.5 size-9 shrink-0 rounded-full bg-muted' />
          <AgentLoadingState label='In the middle of reasoning' />
        </div>
      </section>

      <section className='space-y-3'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'>
          Approval card
        </p>
        <ClarifyPanel
          messageId='approval-preview'
          question='How would you like to watch films this weekend?'
          options={['At the cinema', 'At home', 'A mix of both']}
          status='pending'
        />
      </section>

      <section className='space-y-3'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'>
          Streaming stability
        </p>
        <StreamStabilityPreview />
      </section>

      <section className='space-y-3'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'>
          Tool trace
        </p>
        <ToolCallGroup
          tools={[
            {
              toolCallId: 'preview-1',
              toolName: 'web_search',
              state: 'success',
              inputText: 'Beautiful UI task rows and compact tool traces',
              outputText: 'Found the relevant component patterns.',
            },
            {
              toolCallId: 'preview-2',
              toolName: 'apply_patch',
              state: 'success',
              inputText: 'apps/web/src/components/molecules/chat',
              outputText: 'Updated 3 files.',
            },
            {
              toolCallId: 'preview-3',
              toolName: 'run_tests',
              state: 'running',
              inputText: 'pnpm --filter ./apps/web test --run',
            },
          ]}
        />
      </section>

      <section className='space-y-3'>
        <p className='font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'>
          Task rows
        </p>
        <PlanStatePreview />
      </section>
    </main>
  )
}
