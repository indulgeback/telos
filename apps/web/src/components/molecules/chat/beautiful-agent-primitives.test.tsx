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
import { PlanPanel } from './PlanPanel'
import { VoiceAuraOrb } from './VoiceAuraOrb'

describe('Beautiful UI agent primitives', () => {
  it('keeps a streaming thinking trace expanded', () => {
    const html = renderToStaticMarkup(
      <ThinkingTrace
        text='Inspecting the current interface'
        state='streaming'
        title='Reasoning process'
        thinkingLabel='Thinking'
        doneLabel='Reasoning complete'
      />
    )

    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('Inspecting the current interface')
    expect(html).toContain('Thinking')
    expect(html).toContain('data-thinking-state="live"')
    expect(html).toContain('max-w-none')
    expect(html).not.toContain('max-w-95')
    expect(html).not.toContain('min-height:176px')
  })

  it('collapses a completed persisted trace by default', () => {
    const html = renderToStaticMarkup(
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

  it('renders live tool calls at the available width without demo spacing', () => {
    const fullOutput =
      'Generated image successfully and stored the complete cloud asset URL'
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale='en'
        timeZone='UTC'
        messages={{
          Chat: {
            toolCall: {
              status: {
                success: 'Complete',
                error: 'Failed',
                running: 'Running',
              },
            },
          },
        }}
      >
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
      </NextIntlClientProvider>
    )

    expect(html).toContain('data-tool-chips="live"')
    expect(html).toContain('max-w-none')
    expect(html).toContain(fullOutput)
    expect(html).not.toContain('max-w-80')
    expect(html).not.toContain('min-h-[220px]')
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
