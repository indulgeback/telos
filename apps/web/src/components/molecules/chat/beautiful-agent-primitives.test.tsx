import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/atoms', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  ChatAvatar: ({ className }: { className?: string }) => (
    <span className={className} data-chat-avatar />
  ),
  Dialog: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DialogContent: ({
    children,
    showCloseButton: _showCloseButton,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) => (
    <div {...props}>{children}</div>
  ),
  DialogTitle: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props}>{children}</h2>
  ),
  LiquidOrbIcon: ({ className }: { className?: string }) => (
    <span className={className} data-liquid-orb />
  ),
  TypingIndicator: () => <span data-typing-indicator />,
  Button: ({
    children,
    size: _size,
    radius: _radius,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string
    radius?: string
    variant?: string
  }) => <button {...props}>{children}</button>,
}))
import { AgentLoadingState } from './agent-loading-state'
import { ChatMessage } from './chat-message'
import { ClarifyPanel } from './ClarifyPanel'
import { ThinkingTrace } from './thinking-trace'
import { StreamingText } from './streaming-text'
import { ToolCallGroup } from './tool-call-status'
import { ActivityStatusLine } from './activity-status-line'
import { PlanProgressStrip } from './plan-progress'
import { PlanPanel } from './PlanPanel'
import { VoiceAuraOrb } from './VoiceAuraOrb'

const chatMessages = {
  Chat: {
    toolCall: {
      group: '{count} tool calls',
      groupAllSuccess: 'all succeeded',
      groupHasFailure: 'with failures',
      status: { success: 'Complete', error: 'Failed', running: 'Running' },
      input: 'Input',
      output: 'Output',
      error: 'Error',
      action: {
        read: 'Read {target}',
        write: 'Write {target}',
        run: 'Run {target}',
        search: 'Search {target}',
        prepare: 'Preparing call...',
      },
    },
    activity: {
      preparing: 'Preparing...',
      tool: 'Calling {tool}...',
      planStep: 'Executing plan · step {step} of {total}',
      elapsed: '{seconds}s',
    },
    reasoning: {
      title: 'Reasoning process',
      thinking: 'Thinking',
      done: 'Reasoning complete',
      doneElapsed: 'Thought for {duration}',
    },
    plan: {
      title: 'Execution Plan',
      executing: 'Executing Plan',
      completed: 'Completed',
      failed: 'Failed',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    },
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale='en' timeZone='UTC' messages={chatMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('Beautiful UI agent primitives', () => {
  it('keeps a streaming thinking trace collapsed behind a status row', () => {
    const html = renderWithIntl(
      <ThinkingTrace
        text='Inspecting the current interface'
        state='streaming'
        title='Reasoning process'
        thinkingLabel='Thinking'
        doneLabel='Reasoning complete'
      />
    )

    // 全程折叠：摘要行显示状态，点击才展开内容
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Thinking')
    expect(html).toContain('Inspecting the current interface')
  })

  it('shows the completed summary with the localized done label', () => {
    const html = renderWithIntl(
      <ThinkingTrace
        text='Finished reasoning'
        state='done'
        title='Reasoning process'
        thinkingLabel='Thinking'
        doneLabel='Reasoning complete'
      />
    )

    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Reasoning complete')
  })

  it('announces the localized loading state', () => {
    const html = renderToStaticMarkup(<AgentLoadingState label='Thinking' />)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Thinking"')
    expect(html).toContain('data-loading-state="beautiful-ui"')
    expect(html).toContain('pixel-on')
    expect(html).not.toContain('rounded-2xl')
    expect(html).not.toContain('border-border')
  })

  it('announces actively streamed text and renders a caret', () => {
    const html = renderToStaticMarkup(
      <StreamingText active>Streaming answer</StreamingText>
    )

    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('data-stream-caret="beautiful-ui"')
  })

  it('renders clarification requests with the real Beautiful UI approval card', () => {
    const html = renderToStaticMarkup(
      <ClarifyPanel
        messageId='clarify-1'
        question='Which direction should we take?'
        options={['Option A', 'Option B']}
        status='pending'
      />
    )

    expect(html).toContain('data-approval-card="beautiful-ui"')
    expect(html).toContain('class="beautiful-ui')
    expect(html).toContain('data-clarify-message-id="clarify-1"')
    expect(html).toContain('data-clarify-placement="composer"')
    expect(html).toContain('data-approval-variant="composer"')
    expect(html).toContain('Which direction should we take?')
    expect(html).toContain('Option A')
    expect(html).toContain('aria-label="Custom answer"')
    expect(html).not.toContain('Clarification Needed')
  })

  it('does not render streamed clarification inside chat history', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        id='assistant-client-id'
        role='assistant'
        content=''
        copiedId={null}
        onCopy={() => undefined}
        copyLabel='Copy'
        copiedLabel='Copied'
        contentParts={[
          {
            type: 'clarify',
            clarify: {
              messageId: 'persisted-message-id',
              question: 'Which option?',
              options: ['First', 'Second'],
              status: 'pending',
            },
          },
        ]}
      />
    )

    expect(html).not.toContain('data-clarify-message-id="persisted-message-id"')
    expect(html).not.toContain('data-clarify-message-id="assistant-client-id"')
    expect(html).not.toContain('Which option?')
  })

  it('freezes a reasoning segment once any newer part follows it', () => {
    const html = renderWithIntl(
      <ChatMessage
        id='assistant-freeze'
        role='assistant'
        content=''
        copiedId={null}
        onCopy={() => undefined}
        copyLabel='Copy'
        copiedLabel='Copied'
        isLoading
        reasoningThinkingLabel='Thinking live'
        reasoningDoneLabel='Reasoning complete'
        contentParts={[
          {
            type: 'reasoning',
            reasoning: { text: 'first segment', state: 'streaming' },
          },
          {
            type: 'tool',
            tool: {
              toolCallId: 'call-1',
              toolName: 'read_file',
              state: 'running',
            },
          },
        ]}
      />
    )

    // 段落后出现了工具调用：即使 part.state 仍是 streaming，也按已结束渲染，
    // 计时不再把工具执行的等待算进思考时长
    expect(html).toContain('Reasoning complete')
    expect(html).not.toContain('Thinking live')
  })

  it('keeps the latest reasoning segment live while it is still the last part', () => {
    const html = renderWithIntl(
      <ChatMessage
        id='assistant-live'
        role='assistant'
        content=''
        copiedId={null}
        onCopy={() => undefined}
        copyLabel='Copy'
        copiedLabel='Copied'
        isLoading
        reasoningThinkingLabel='Thinking live'
        reasoningDoneLabel='Reasoning complete'
        contentParts={[
          {
            type: 'reasoning',
            reasoning: { text: 'still thinking', state: 'streaming' },
          },
        ]}
      />
    )

    expect(html).toContain('Thinking live')
  })

  it('does not leave a green completion chip for answered composer clarification', () => {
    const html = renderToStaticMarkup(
      <ClarifyPanel
        messageId='clarify-answered'
        question='Which option?'
        options={['First', 'Second']}
        status='answered'
        selectedOption='First'
        placement='composer'
      />
    )

    expect(html).not.toContain('bg-green-tint')
    expect(html).not.toContain('First')
  })

  it('renders a single tool call as one status row with a collapsible detail drawer', () => {
    const fullOutput =
      'Generated image successfully and stored the complete cloud asset URL'
    const html = renderWithIntl(
      <ToolCallGroup
        tools={[
          {
            toolCallId: 'generate-image-1',
            toolName: 'generate_image',
            state: 'success',
            outputText: fullOutput,
          },
        ]}
      />
    )

    // 单工具不渲染组头；行动作摘要来自工具名；详情默认折叠但保留在 DOM
    expect(html).not.toContain('data-tool-chips')
    expect(html).toContain('generate image')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain(fullOutput)
  })

  it('collapses a finished tool group into a localized summary row', () => {
    const html = renderWithIntl(
      <ToolCallGroup
        tools={[
          {
            toolCallId: 'call-1',
            toolName: 'read_file',
            state: 'success',
            outputText: 'file body',
          },
          {
            toolCallId: 'call-2',
            toolName: 'run_command',
            state: 'error',
            errorText: 'exit code 1',
          },
        ]}
      />
    )

    expect(html).toContain('2 tool calls')
    expect(html).toContain('with failures')
    expect(html).toContain('aria-expanded="false"')
  })

  it('shows the live tool activity on the dynamic status line', () => {
    const html = renderWithIntl(
      <ActivityStatusLine
        activity={{
          phase: 'tool',
          tool: {
            toolCallId: 'call-1',
            toolName: 'read_file',
            state: 'running',
            inputText: '{"file_path":"src/app/page.tsx"}',
          },
        }}
      />
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('Calling read_file...')
  })

  it('renders the plan execution strip with progress and current step', () => {
    const html = renderWithIntl(
      <PlanProgressStrip
        summary='Prepare and verify the plan.'
        steps={[
          { description: 'Inspect files' },
          { description: 'Apply the fix' },
          { description: 'Run tests' },
        ]}
        status='executing'
        stepStatuses={['completed', 'in_progress', 'pending']}
      />
    )

    expect(html).toContain('data-plan-progress="strip"')
    expect(html).toContain('Executing Plan')
    expect(html).toContain('1/3')
    expect(html).toContain('Apply the fix')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('role="progressbar"')
  })

  it('uses the readable list layout for long execution plans', () => {
    const longStep =
      'Confirm the complete visual direction and preserve every required scene before generating the final composition'
    const html = renderToStaticMarkup(
      <PlanPanel
        summary='Prepare and verify the complete execution plan.'
        steps={[
          { description: longStep, tool_hint: 'clarify_question' },
          { description: 'Generate and verify the final assets.' },
        ]}
        status='pending'
        titleLabel='Execution plan'
        approveLabel='Approve & execute'
        rejectLabel='Reject'
        approvedLabel='Approved'
        rejectedLabel='Rejected'
        pendingLabel='Pending'
        onApprove={() => undefined}
        onReject={() => undefined}
      />
    )

    expect(html).toContain('data-plan-layout="list"')
    expect(html).toContain(longStep)
    expect(html).toContain('clarify_question')
    expect(html).not.toContain('aria-expanded')
    expect(html).not.toContain('truncate text-[13px]')
  })

  it('renders the neutral voice meter without a canvas dependency', () => {
    const html = renderToStaticMarkup(
      <VoiceAuraOrb state='listening' amplitude={0.5} />
    )

    expect(html).not.toContain('<canvas')
    expect(html.match(/<span/g)).toHaveLength(12)
  })
})
