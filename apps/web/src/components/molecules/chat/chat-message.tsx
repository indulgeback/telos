'use client'

import { memo, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  AiLottieIcon,
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
import { ToolCallStatus, type ToolCallPreview } from './tool-call-status'
import { ClarifyPanel } from './ClarifyPanel'
import {
  Copy,
  Check,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Mic2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type PlanStepStatus =
  'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

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
        status: 'pending' | 'approved' | 'rejected'
        /** 每步的执行状态（execute 阶段实时更新）。长度与 steps 一致 */
        stepStatuses?: PlanStepStatus[]
        /** 旧格式兼容：纯文本计划 */
        text?: string
      }
    }
  | {
      type: 'clarify'
      clarify: {
        question: string
        options: string[]
        status: 'pending' | 'answered'
        selectedOption?: string | null
      }
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
  // Plan 模式相关
  planTitle?: string
  planApproveLabel?: string
  planRejectLabel?: string
  planApprovedLabel?: string
  planRejectedLabel?: string
  planPendingLabel?: string
  /** 当前消息是否为待批准的计划（用于显示批准/放弃按钮） */
  isPendingPlan?: boolean
  onApprovePlan?: () => void
  onRejectPlan?: () => void
  onClarifySelect?: (messageId: string, option: string) => void
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
  planTitle = 'Plan',
  planApproveLabel = 'Approve',
  planRejectLabel = 'Reject',
  planApprovedLabel = 'Approved',
  planRejectedLabel = 'Rejected',
  planPendingLabel = 'Pending',
  isPendingPlan = false,
  onApprovePlan,
  onRejectPlan,
  onClarifySelect,
}: ChatMessageProps) {
  const safeContent = content ?? ''
  const safeImages = images ?? []
  const safeContentParts = contentParts ?? []
  const isAssistant = role === 'assistant'
  const hasContent = safeContent.length > 0
  const hasImages = safeImages.length > 0
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isAvatarBouncing, setIsAvatarBouncing] = useState(false)
  const avatarBounceTimerRef = useRef<number | null>(null)

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
        'flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && (
        <button
          type='button'
          onClick={handleAssistantAvatarClick}
          aria-label='Animate assistant avatar'
          className={cn(
            'flex size-14 shrink-0 items-center justify-center outline-none',
            isAvatarBouncing && 'chat-assistant-avatar-jelly'
          )}
        >
          <AiLottieIcon className='size-14' play={isLoading} />
        </button>
      )}

      <div
        className={cn(
          'flex w-full max-w-[85%] flex-col gap-2',
          isAssistant ? 'items-start pr-4' : 'items-end'
        )}
      >
        {isAssistant ? (
          <div className='w-full'>
            {safeContentParts.length > 0 ? (
              <div className='space-y-3'>
                {safeContentParts.map((part, index) => {
                  if (part.type === 'tool') {
                    return (
                      <ToolCallStatus
                        key={`${part.tool.toolCallId}-${index}`}
                        tool={part.tool}
                      />
                    )
                  }

                  if (part.type === 'reasoning') {
                    return (
                      <details
                        key={`reasoning-${id}-${index}`}
                        className='chat-reasoning-details text-xs text-muted-foreground [&_summary::-webkit-details-marker]:hidden'
                      >
                        <summary className='inline-flex cursor-pointer list-none items-center gap-2 rounded-md py-0.5 pr-2 transition-colors hover:text-foreground'>
                          <span className='inline-flex items-center gap-1.5 font-medium'>
                            <ChevronRight className='chat-reasoning-chevron size-3.5' />
                            {reasoningTitle}
                          </span>
                          <span className='h-1 w-1 rounded-full bg-current opacity-35' />
                          <span className='text-[11px] text-muted-foreground/80'>
                            {part.reasoning.state === 'streaming'
                              ? reasoningThinkingLabel
                              : reasoningDoneLabel}
                          </span>
                        </summary>
                        <div className='ml-[7px] mt-2 border-l border-border/70 pl-4 whitespace-pre-wrap text-xs leading-relaxed text-foreground/75'>
                          {part.reasoning.text}
                        </div>
                      </details>
                    )
                  }

                  if (part.type === 'plan') {
                    const { summary, steps, status, stepStatuses } = part.plan
                    const showActions = isPendingPlan && status === 'pending'
                    const stepStatusIcon = (sStatus?: PlanStepStatus) => {
                      switch (sStatus) {
                        case 'completed':
                          return (
                            <CheckCircle2 className='size-3.5 shrink-0 text-emerald-500' />
                          )
                        case 'in_progress':
                          return (
                            <Loader2 className='size-3.5 shrink-0 animate-spin text-blue-500' />
                          )
                        case 'failed':
                          return (
                            <XCircle className='size-3.5 shrink-0 text-rose-500' />
                          )
                        case 'skipped':
                          return (
                            <MinusCircle className='size-3.5 shrink-0 text-muted-foreground' />
                          )
                        default:
                          return (
                            <Clock className='size-3.5 shrink-0 text-amber-500/60' />
                          )
                      }
                    }
                    // steps 可能是字符串数组（旧格式）或对象数组（新格式）
                    const normalizedSteps = steps.map(s =>
                      typeof s === 'string'
                        ? { description: s }
                        : { description: s.description, tool_hint: s.tool_hint }
                    )
                    return (
                      <div
                        key={`plan-${id}-${index}`}
                        className='rounded-lg border border-primary/30 bg-primary/5 p-3'
                      >
                        <div className='mb-2 flex items-center gap-1.5 text-sm font-medium text-primary'>
                          <ClipboardList className='size-4 shrink-0' />
                          <span>{planTitle}</span>
                          <span className='ml-auto inline-flex items-center gap-1 text-[11px] font-normal'>
                            {status === 'approved' && (
                              <>
                                <CheckCircle2 className='size-3 text-emerald-500' />
                                {planApprovedLabel}
                              </>
                            )}
                            {status === 'rejected' && (
                              <>
                                <XCircle className='size-3 text-rose-500' />
                                {planRejectedLabel}
                              </>
                            )}
                            {status === 'pending' && (
                              <>
                                <Clock className='size-3 text-amber-500' />
                                {planPendingLabel}
                              </>
                            )}
                          </span>
                        </div>
                        {summary && (
                          <p className='mb-2 text-xs text-foreground/70'>
                            {summary}
                          </p>
                        )}
                        <ol className='ml-1 space-y-1.5 text-xs leading-relaxed text-foreground/80'>
                          {normalizedSteps.map((step, stepIndex) => {
                            const sStatus = stepStatuses?.[stepIndex]
                            return (
                              <li
                                key={stepIndex}
                                data-step={stepIndex}
                                data-status={sStatus ?? 'pending'}
                                className='flex items-start gap-2'
                              >
                                {stepStatuses ? (
                                  stepStatusIcon(sStatus)
                                ) : (
                                  <span className='font-medium text-primary/70'>
                                    {stepIndex + 1}.
                                  </span>
                                )}
                                <span className='flex-1'>
                                  {step.description}
                                  {step.tool_hint && (
                                    <span className='ml-1 text-[10px] text-muted-foreground'>
                                      ({step.tool_hint})
                                    </span>
                                  )}
                                </span>
                              </li>
                            )
                          })}
                        </ol>
                        {showActions && (
                          <div className='mt-3 flex items-center gap-2'>
                            <Button
                              type='button'
                              size='sm'
                              radius='md'
                              onClick={onApprovePlan}
                            >
                              <CheckCircle2 className='size-3.5' />
                              {planApproveLabel}
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              radius='md'
                              variant='outline'
                              onClick={onRejectPlan}
                            >
                              <XCircle className='size-3.5' />
                              {planRejectLabel}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  }

                  if (part.type === 'clarify') {
                    const { question, options, status, selectedOption } =
                      part.clarify
                    return (
                      <ClarifyPanel
                        key={`clarify-${id}-${index}`}
                        messageId={id}
                        question={question}
                        options={options}
                        status={status}
                        selectedOption={selectedOption}
                        onSelect={async option => {
                          if (onClarifySelect) {
                            onClarifySelect(id, option)
                          }
                        }}
                      />
                    )
                  }

                  return (
                    <div
                      key={`text-${id}-${index}`}
                      className='max-w-none text-sm leading-relaxed'
                    >
                      <div
                        className={cn(
                          'chat-assistant-markdown prose prose-sm dark:prose-invert'
                        )}
                      >
                        <MarkdownContent content={part.text} />
                      </div>
                      {/* 当助手输出 SKILL.md 时,渲染「保存为技能」按钮 */}
                      <SkillSaver text={part.text} />
                    </div>
                  )
                })}
              </div>
            ) : hasContent ? (
              <div
                key={`${id}-content`}
                className='max-w-none text-sm leading-relaxed'
              >
                <div
                  className={cn(
                    'chat-assistant-markdown prose prose-sm dark:prose-invert'
                  )}
                >
                  <MarkdownContent content={safeContent} />
                </div>
                {/* 当助手输出 SKILL.md 时,渲染「保存为技能」按钮 */}
                <SkillSaver text={safeContent} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className='flex max-w-full flex-col items-end gap-1.5'>
            <Card className='relative px-4 py-3 shadow-sm bg-primary text-primary-foreground'>
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
                Live transcript
              </span>
            )}
          </div>
        )}

        {isAssistant && (
          <div className='flex items-center gap-1'>
            {isLoading ? (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <TypingIndicator />
              </div>
            ) : hasContent ? (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 gap-1 px-2 text-xs text-muted-foreground'
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
                    className='h-7 gap-1 px-2 text-xs text-muted-foreground'
                    onClick={onRetry}
                  >
                    <RotateCcw className='size-3' />
                    {retryLabel}
                  </Button>
                )}
                {assistantModelLabel ? (
                  <span className='ml-1 inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground ring-1 ring-border/60'>
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

  const prevCopied = prev.copiedId === prev.id
  const nextCopied = next.copiedId === next.id
  if (prevCopied !== nextCopied) return false

  if (!compareContentParts(prev.contentParts, next.contentParts)) return false
  if (!compareToolCalls(prev.toolCalls, next.toolCalls)) return false

  return true
}

export const ChatMessage = memo(ChatMessageInner, areEqual)
ChatMessage.displayName = 'ChatMessage'
