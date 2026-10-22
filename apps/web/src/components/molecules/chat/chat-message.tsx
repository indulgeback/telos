'use client'

import { memo, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  LiquidOrbIcon,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  TypingIndicator,
  ChatAvatar,
} from '@/components/atoms'
import { MarkdownContent } from './markdown-content'
import { SkillSaver } from './SkillSaver'
import { ToolCallGroup, type ToolCallPreview } from './tool-call-status'
import { ThinkingTrace } from './thinking-trace'
import { AgentLoadingState } from './agent-loading-state'
import { ActivityStatusLine } from './activity-status-line'
import { PlanProgressStrip } from './plan-progress'
import { StreamRevealText } from './stream-reveal-text'
import { WebSearchPill } from './web-search-pill'
import type { WebSearchResultItem } from '@/app/[locale]/(dashboard)/chat/web-search-results'
import { parseWebSearchOutput } from '@/app/[locale]/(dashboard)/chat/web-search-results'
import { deriveAssistantActivity } from '@/app/[locale]/(dashboard)/chat/chat-activity'
import { StreamingText } from './streaming-text'
import { PlanPanel, type PlanStepStatus } from './PlanPanel'
import {
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Mic2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AssistantContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'reasoning'
      reasoning: {
        text: string
        state?: 'streaming' | 'done'
      }
    }
  | { type: 'tool'; tool: ToolCallPreview }
  | {
      type: 'plan'
      plan: {
        summary?: string
        steps: Array<{ description: string; tool_hint?: string }>
        status:
          | 'pending'
          | 'approved'
          | 'rejected'
          | 'executing'
          | 'completed'
          | 'failed'
        /** 每步的执行状态（execute 阶段实时更新）。长度与 steps 一致 */
        stepStatuses?: PlanStepStatus[]
        /** 旧格式兼容：纯文本计划 */
        text?: string
      }
    }
  | {
      type: 'clarify'
      clarify: {
        messageId?: string
        question: string
        options: string[]
        status: 'pending' | 'answered'
        selectedOption?: string | null
      }
    }
  | { type: 'error'; message: string }

type RenderContentPart =
  | Exclude<AssistantContentPart, { type: 'tool' }>
  | { type: 'tool-group'; tools: ToolCallPreview[] }

function groupConsecutiveToolParts(
  parts: AssistantContentPart[]
): RenderContentPart[] {
  return parts.reduce<RenderContentPart[]>((grouped, part) => {
    if (part.type !== 'tool') {
      grouped.push(part)
      return grouped
    }

    const previous = grouped[grouped.length - 1]
    if (previous?.type === 'tool-group') {
      previous.tools.push(part.tool)
    } else {
      grouped.push({ type: 'tool-group', tools: [part.tool] })
    }
    return grouped
  }, [])
}

/**
 * 一组连续工具全部是成功解析出结构化结果的 web_search 时，返回聚合结果
 * （替代通用工具卡渲染搜索胶囊）；混入其它工具或旧格式输出则返回 null。
 */
function collectGroupSearchResults(
  tools: ToolCallPreview[]
): WebSearchResultItem[] | null {
  if (tools.length === 0) return null
  const aggregated: WebSearchResultItem[] = []
  for (const tool of tools) {
    if (tool.toolName !== 'web_search' || tool.state === 'error') return null
    const parsed = parseWebSearchOutput(tool.outputText)
    if (!parsed) return null
    aggregated.push(...parsed)
  }
  return aggregated.length > 0 ? aggregated : null
}

export interface ChatMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  contentParts?: AssistantContentPart[]
  toolCalls?: ToolCallPreview[]
  copiedId: string | null
  onCopy: (content: string, id: string) => void
  copyLabel: string
  copiedLabel: string
  isLoading?: boolean
  onRetry?: () => void
  retryLabel?: string
  assistantModelLabel?: string
  usedModelLabel?: string
  reasoningTitle?: string
  reasoningThinkingLabel?: string
  reasoningDoneLabel?: string
  imagePreviewLabel?: string
  imagePrevLabel?: string
  imageNextLabel?: string
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
  isVoiceTranscript?: boolean
  liveTranscriptLabel?: string
  // Plan 模式相关
  planTitle?: string
  planApproveLabel?: string
  planRejectLabel?: string
  planApprovedLabel?: string
  planRejectedLabel?: string
  planPendingLabel?: string
  planCompletedLabel?: string
  planFailedLabel?: string
  /** 当前消息是否为待批准的计划（用于显示批准/放弃按钮） */
  isPendingPlan?: boolean
  onApprovePlan?: () => void
  onRejectPlan?: () => void
  /** 消息含可解析的 web_search 结果时生效：打开来源面板（highlightIndex 用于引用角标定位） */
  onOpenSearchResults?: (
    results: WebSearchResultItem[],
    title: string,
    highlightIndex?: number
  ) => void
}

function compareToolPreview(
  prev: ToolCallPreview,
  next: ToolCallPreview
): boolean {
  return (
    prev.toolCallId === next.toolCallId &&
    prev.toolName === next.toolName &&
    prev.state === next.state &&
    prev.inputText === next.inputText &&
    prev.outputText === next.outputText &&
    prev.errorText === next.errorText
  )
}

function compareContentParts(
  prev: AssistantContentPart[] | undefined,
  next: AssistantContentPart[] | undefined
): boolean {
  const prevParts = prev ?? []
  const nextParts = next ?? []
  if (prevParts.length !== nextParts.length) return false

  for (let i = 0; i < prevParts.length; i += 1) {
    const prevPart = prevParts[i]
    const nextPart = nextParts[i]
    if (!prevPart || !nextPart || prevPart.type !== nextPart.type) return false

    if (prevPart.type === 'text' && nextPart.type === 'text') {
      if (prevPart.text !== nextPart.text) return false
      continue
    }

    if (prevPart.type === 'reasoning' && nextPart.type === 'reasoning') {
      if (
        prevPart.reasoning.text !== nextPart.reasoning.text ||
        prevPart.reasoning.state !== nextPart.reasoning.state
      ) {
        return false
      }
      continue
    }

    if (prevPart.type === 'tool' && nextPart.type === 'tool') {
      if (!compareToolPreview(prevPart.tool, nextPart.tool)) return false
      continue
    }

    if (prevPart.type === 'plan' && nextPart.type === 'plan') {
      if (
        prevPart.plan.status !== nextPart.plan.status ||
        prevPart.plan.summary !== nextPart.plan.summary ||
        prevPart.plan.steps.length !== nextPart.plan.steps.length ||
        prevPart.plan.steps.some(
          (s, idx) => s.description !== nextPart.plan.steps[idx]?.description
        ) ||
        JSON.stringify(prevPart.plan.stepStatuses) !==
          JSON.stringify(nextPart.plan.stepStatuses)
      ) {
        return false
      }
      continue
    }

    if (prevPart.type === 'error' && nextPart.type === 'error') {
      if (prevPart.message !== nextPart.message) return false
      continue
    }

    if (prevPart.type === 'clarify' && nextPart.type === 'clarify') {
      if (
        prevPart.clarify.status !== nextPart.clarify.status ||
        prevPart.clarify.question !== nextPart.clarify.question ||
        prevPart.clarify.selectedOption !== nextPart.clarify.selectedOption ||
        prevPart.clarify.options.length !== nextPart.clarify.options.length ||
        prevPart.clarify.options.some(
          (o, idx) => o !== nextPart.clarify.options[idx]
        )
      ) {
        return false
      }
      continue
    }

    return false
  }

  return true
}

function compareToolCalls(
  prev: ToolCallPreview[] | undefined,
  next: ToolCallPreview[] | undefined
): boolean {
  const prevCalls = prev ?? []
  const nextCalls = next ?? []
  if (prevCalls.length !== nextCalls.length) return false
  for (let i = 0; i < prevCalls.length; i += 1) {
    const prevCall = prevCalls[i]
    const nextCall = nextCalls[i]
    if (!prevCall || !nextCall || !compareToolPreview(prevCall, nextCall)) {
      return false
    }
  }
  return true
}

function ChatMessageInner({
  id,
  role,
  content,
  images = [],
  contentParts = [],
  toolCalls: _toolCalls = [],
  copiedId,
  onCopy,
  copyLabel,
  copiedLabel,
  isLoading = false,
  onRetry,
  retryLabel = 'Retry',
  assistantModelLabel,
  usedModelLabel = 'Model',
  reasoningTitle = 'Reasoning',
  reasoningThinkingLabel = 'Thinking',
  reasoningDoneLabel = 'Done',
  imagePreviewLabel = 'Preview image',
  imagePrevLabel = 'Previous image',
  imageNextLabel = 'Next image',
  userAvatarUrl,
  userInitials,
  isVoiceTranscript = false,
  liveTranscriptLabel = 'Live transcript',
  planTitle = 'Plan',
  planApproveLabel = 'Approve',
  planRejectLabel = 'Reject',
  planApprovedLabel = 'Approved',
  planRejectedLabel = 'Rejected',
  planPendingLabel = 'Pending',
  planCompletedLabel = 'Completed',
  planFailedLabel = 'Failed',
  isPendingPlan = false,
  onApprovePlan,
  onRejectPlan,
  onOpenSearchResults,
}: ChatMessageProps) {
  const safeContent = content ?? ''
  const safeImages = images ?? []
  const safeContentParts = contentParts ?? []
  const groupedContentParts = groupConsecutiveToolParts(safeContentParts)
  const activity = deriveAssistantActivity(safeContentParts, { isLoading })
  const isAssistant = role === 'assistant'
  const hasContent = safeContent.length > 0
  const hasImages = safeImages.length > 0
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isAvatarBouncing, setIsAvatarBouncing] = useState(false)
  const avatarBounceTimerRef = useRef<number | null>(null)

  // 引用角标 [n] 定位到的是全消息聚合去重后的结果序号
  const handleMessageCitationClick = (citationIndex: number) => {
    if (!onOpenSearchResults) return
    const aggregated: WebSearchResultItem[] = []
    const seen = new Set<string>()
    for (const part of groupedContentParts) {
      if (part.type !== 'tool-group') continue
      const results = collectGroupSearchResults(part.tools)
      if (!results) continue
      for (const item of results) {
        if (seen.has(item.url)) continue
        seen.add(item.url)
        aggregated.push(item)
      }
    }
    if (aggregated.length > 0) {
      onOpenSearchResults(aggregated, safeContent.slice(0, 60), citationIndex)
    }
  }

  useEffect(() => {
    return () => {
      if (avatarBounceTimerRef.current) {
        window.clearTimeout(avatarBounceTimerRef.current)
      }
    }
  }, [])

  const handleAssistantAvatarClick = () => {
    setIsAvatarBouncing(false)
    requestAnimationFrame(() => {
      setIsAvatarBouncing(true)
      if (avatarBounceTimerRef.current) {
        window.clearTimeout(avatarBounceTimerRef.current)
      }
      avatarBounceTimerRef.current = window.setTimeout(() => {
        setIsAvatarBouncing(false)
      }, 780)
    })
  }

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:gap-4',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && (
        <button
          type='button'
          onClick={handleAssistantAvatarClick}
          aria-label='Animate liquid orb avatar'
          className={cn(
            'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-transparent outline-none transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-foreground/20',
            isAvatarBouncing && 'chat-assistant-avatar-jelly'
          )}
        >
          <LiquidOrbIcon className='size-9' play={isLoading} />
        </button>
      )}

      <div
        className={cn(
          'flex flex-col gap-2',
          isAssistant
            ? 'w-full max-w-full items-start pr-1 sm:pr-4'
            : 'max-w-[88%] items-end sm:max-w-[82%]'
        )}
      >
        {isAssistant ? (
          <div className='w-full'>
            {groupedContentParts.length > 0 ? (
              <div className='space-y-3'>
                {isLoading &&
                  activity.phase !== 'thinking' &&
                  activity.phase !== 'idle' && (
                    <ActivityStatusLine activity={activity} />
                  )}
                {groupedContentParts.map((part, index) => {
                  if (part.type === 'tool-group') {
                    const openResults = onOpenSearchResults
                    const searchResults = openResults
                      ? collectGroupSearchResults(part.tools)
                      : null
                    if (searchResults && openResults) {
                      return (
                        <WebSearchPill
                          key={`${part.tools[0]?.toolCallId ?? 'tools'}-${index}`}
                          results={searchResults}
                          onOpen={items =>
                            openResults(items, safeContent.slice(0, 60))
                          }
                        />
                      )
                    }
                    return (
                      <ToolCallGroup
                        key={`${part.tools[0]?.toolCallId ?? 'tools'}-${index}`}
                        tools={part.tools}
                      />
                    )
                  }

                  if (part.type === 'reasoning') {
                    // 后端的 reasoning.done 只在整轮流结束时发一次；段落级
                    // 结束没有信号。只要这段思考后面出现了任何新内容
                    // （工具/文本/计划），或整条消息已加载完毕，即视为该段
                    // 思考已结束，冻结计时，避免把工具执行的等待算进思考时长。
                    const isLastPart = index === groupedContentParts.length - 1
                    const reasoningLive =
                      isLoading &&
                      isLastPart &&
                      part.reasoning.state === 'streaming'
                    return (
                      <ThinkingTrace
                        key={`reasoning-${id}-${index}`}
                        text={part.reasoning.text}
                        state={reasoningLive ? 'streaming' : 'done'}
                        title={reasoningTitle}
                        thinkingLabel={reasoningThinkingLabel}
                        doneLabel={reasoningDoneLabel}
                      />
                    )
                  }

                  if (part.type === 'plan') {
                    const { summary, steps, status, stepStatuses } = part.plan
                    const showActions = isPendingPlan && status === 'pending'
                    // steps 可能是字符串数组（旧格式）或对象数组（新格式）
                    const normalizedSteps = steps.map(s =>
                      typeof s === 'string'
                        ? { description: s }
                        : { description: s.description, tool_hint: s.tool_hint }
                    )
                    // 待批准的计划保留完整面板（含审批按钮）；
                    // 执行中/完成/历史消息一律用紧凑进度条，避免挤占消息流
                    if (!showActions) {
                      return (
                        <PlanProgressStrip
                          key={`plan-${id}-${index}`}
                          summary={summary}
                          steps={normalizedSteps}
                          status={status}
                          stepStatuses={stepStatuses}
                        />
                      )
                    }
                    return (
                      <PlanPanel
                        key={`plan-${id}-${index}`}
                        summary={summary}
                        steps={normalizedSteps}
                        status={status}
                        stepStatuses={stepStatuses}
                        titleLabel={planTitle}
                        approveLabel={planApproveLabel}
                        rejectLabel={planRejectLabel}
                        approvedLabel={planApprovedLabel}
                        rejectedLabel={planRejectedLabel}
                        pendingLabel={planPendingLabel}
                        completedLabel={planCompletedLabel}
                        failedLabel={planFailedLabel}
                        onApprove={showActions ? onApprovePlan : undefined}
                        onReject={showActions ? onRejectPlan : undefined}
                      />
                    )
                  }

                  if (part.type === 'clarify') {
                    // Clarification is a composer-level bottom pane. The
                    // selected answer is already persisted as a user message,
                    // so rendering this part in history would duplicate state.
                    return null
                  }

                  if (part.type === 'error') {
                    return (
                      <div
                        key={`error-${id}-${index}`}
                        className='flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/5 px-3.5 py-3'
                        role='alert'
                      >
                        <AlertTriangle className='mt-0.5 size-4 shrink-0 text-red-500' />
                        <p className='min-w-0 flex-1 break-words text-[13px] leading-relaxed text-red-600 dark:text-red-400'>
                          {part.message}
                        </p>
                        {onRetry && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-7 shrink-0 gap-1 rounded-lg px-2 text-[11px] text-red-600 hover:bg-red-500/10 dark:text-red-400'
                            onClick={onRetry}
                          >
                            <RotateCcw className='size-3' />
                            {retryLabel}
                          </Button>
                        )}
                      </div>
                    )
                  }

                  const isStreamingPart =
                    isLoading && index === groupedContentParts.length - 1

                  return (
                    <div
                      key={`text-${id}-${index}`}
                      className='max-w-none text-[14px] leading-7'
                    >
                      {isStreamingPart ? (
                        <StreamRevealText
                          text={part.text}
                          active={isStreamingPart}
                          className={cn(
                            'chat-assistant-markdown prose prose-sm dark:prose-invert'
                          )}
                        />
                      ) : (
                        <StreamingText
                          className={cn(
                            'chat-assistant-markdown prose prose-sm dark:prose-invert'
                          )}
                          active={false}
                        >
                          <MarkdownContent
                            content={part.text}
                            onCitationClick={handleMessageCitationClick}
                          />
                        </StreamingText>
                      )}
                      {/* 当助手输出 SKILL.md 时,渲染「保存为技能」按钮 */}
                      <SkillSaver text={part.text} />
                    </div>
                  )
                })}
              </div>
            ) : hasContent ? (
              <div
                key={`${id}-content`}
                className='max-w-none text-[14px] leading-7'
              >
                <StreamingText
                  className={cn(
                    'chat-assistant-markdown prose prose-sm dark:prose-invert'
                  )}
                  active={isLoading}
                >
                  <MarkdownContent
                    content={safeContent}
                    onCitationClick={handleMessageCitationClick}
                  />
                </StreamingText>
                {/* 当助手输出 SKILL.md 时,渲染「保存为技能」按钮 */}
                <SkillSaver text={safeContent} />
              </div>
            ) : isLoading ? (
              <AgentLoadingState label={reasoningThinkingLabel} />
            ) : null}
          </div>
        ) : (
          <div className='flex max-w-full flex-col items-end gap-1.5'>
            <Card className='relative rounded-2xl rounded-tr-md border-0 bg-primary px-4 py-3 text-primary-foreground shadow-none'>
              {hasImages && (
                <div className='mb-2 flex flex-col gap-2 max-w-[400px] w-full'>
                  {safeImages.map((src, index) => (
                    <button
                      type='button'
                      key={`${id}-img-${index}`}
                      className='relative flex overflow-hidden rounded-md bg-primary-foreground/10 transition-opacity hover:opacity-90'
                      onClick={() => {
                        setPreviewIndex(index)
                        setPreviewOpen(true)
                      }}
                      aria-label={imagePreviewLabel}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 本地 blob/任意远端预览,无需 next/image 优化管线 */}
                      <img
                        src={src}
                        alt={`user-image-${index + 1}`}
                        className='max-w-full h-auto max-h-[280px] rounded-md object-contain'
                      />
                    </button>
                  ))}
                </div>
              )}
              {hasContent ? (
                <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
                  {safeContent}
                </p>
              ) : (
                <TypingIndicator />
              )}
            </Card>
            {isVoiceTranscript && hasContent && (
              <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground'>
                <Mic2 className='size-3' />
                {liveTranscriptLabel}
              </span>
            )}
          </div>
        )}

        {isAssistant && (
          <div className='flex items-center gap-1.5'>
            {!isLoading && hasContent ? (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 gap-1 rounded-lg px-2 font-mono text-[10px] text-muted-foreground hover:bg-muted'
                  onClick={() => onCopy(safeContent, id)}
                >
                  {copiedId === id ? (
                    <>
                      <Check className='size-3' />
                      {copiedLabel}
                    </>
                  ) : (
                    <>
                      <Copy className='size-3' />
                      {copyLabel}
                    </>
                  )}
                </Button>
                {onRetry && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 gap-1 rounded-lg px-2 font-mono text-[10px] text-muted-foreground hover:bg-muted'
                    onClick={onRetry}
                  >
                    <RotateCcw className='size-3' />
                    {retryLabel}
                  </Button>
                )}
                {assistantModelLabel ? (
                  <span className='ml-1 inline-flex h-7 items-center rounded-lg bg-muted px-2 font-mono text-[9px] text-muted-foreground'>
                    {usedModelLabel}: {assistantModelLabel}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </div>

      {!isAssistant && (
        <ChatAvatar
          type='user'
          imageUrl={userAvatarUrl}
          initials={userInitials}
        />
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          showCloseButton
          className='max-w-[92vw] border-none bg-transparent p-0 shadow-none sm:max-w-4xl [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:bg-black/55 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:shadow-md [&_[data-slot=dialog-close]]:hover:bg-black/70'
        >
          <DialogTitle className='sr-only'>
            {`${imagePreviewLabel} ${previewIndex + 1}/${safeImages.length}`}
          </DialogTitle>
          <div className='relative flex items-center justify-center'>
            {safeImages[previewIndex] && (
              <div className='relative h-[72vh] w-full overflow-hidden rounded-xl bg-black/70'>
                <Image
                  src={safeImages[previewIndex]}
                  alt={`preview-image-${previewIndex + 1}`}
                  fill
                  unoptimized
                  sizes='90vw'
                  className='object-contain'
                />
              </div>
            )}

            {safeImages.length > 1 && (
              <>
                <Button
                  type='button'
                  variant='secondary'
                  size='icon'
                  radius='full'
                  className='absolute left-3 top-1/2 -translate-y-1/2 bg-background/85'
                  onClick={() =>
                    setPreviewIndex(
                      (previewIndex - 1 + safeImages.length) % safeImages.length
                    )
                  }
                  aria-label={imagePrevLabel}
                >
                  <ChevronLeft className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='secondary'
                  size='icon'
                  radius='full'
                  className='absolute right-3 top-1/2 -translate-y-1/2 bg-background/85'
                  onClick={() =>
                    setPreviewIndex((previewIndex + 1) % safeImages.length)
                  }
                  aria-label={imageNextLabel}
                >
                  <ChevronRight className='size-4' />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function areEqual(prev: ChatMessageProps, next: ChatMessageProps): boolean {
  if (prev.id !== next.id) return false
  if (prev.role !== next.role) return false
  if (prev.content !== next.content) return false
  const prevImages = prev.images ?? []
  const nextImages = next.images ?? []
  if (prevImages.length !== nextImages.length) return false
  for (let i = 0; i < prevImages.length; i += 1) {
    if (prevImages[i] !== nextImages[i]) return false
  }
  if (prev.isLoading !== next.isLoading) return false
  if (prev.retryLabel !== next.retryLabel) return false
  if (prev.assistantModelLabel !== next.assistantModelLabel) return false
  if (prev.usedModelLabel !== next.usedModelLabel) return false
  if (prev.reasoningTitle !== next.reasoningTitle) return false
  if (prev.reasoningThinkingLabel !== next.reasoningThinkingLabel) return false
  if (prev.reasoningDoneLabel !== next.reasoningDoneLabel) return false
  if (prev.imagePreviewLabel !== next.imagePreviewLabel) return false
  if (prev.imagePrevLabel !== next.imagePrevLabel) return false
  if (prev.imageNextLabel !== next.imageNextLabel) return false
  if (prev.userAvatarUrl !== next.userAvatarUrl) return false
  if (prev.userInitials !== next.userInitials) return false
  // onRetry/onApprovePlan/onRejectPlan 每次渲染都是新引用,只能比"有无":
  // 它们的存在性决定重试按钮/审批按钮是否渲染,漏比会让按钮残留且闭包过期
  if (Boolean(prev.onRetry) !== Boolean(next.onRetry)) return false
  if (Boolean(prev.onOpenSearchResults) !== Boolean(next.onOpenSearchResults)) {
    return false
  }
  if (prev.isPendingPlan !== next.isPendingPlan) return false
  if (prev.isVoiceTranscript !== next.isVoiceTranscript) return false
  if (prev.liveTranscriptLabel !== next.liveTranscriptLabel) return false
  if (Boolean(prev.onApprovePlan) !== Boolean(next.onApprovePlan)) return false
  if (Boolean(prev.onRejectPlan) !== Boolean(next.onRejectPlan)) return false

  const prevCopied = prev.copiedId === prev.id
  const nextCopied = next.copiedId === next.id
  if (prevCopied !== nextCopied) return false

  if (!compareContentParts(prev.contentParts, next.contentParts)) return false
  if (!compareToolCalls(prev.toolCalls, next.toolCalls)) return false

  return true
}

export const ChatMessage = memo(ChatMessageInner, areEqual)
ChatMessage.displayName = 'ChatMessage'
