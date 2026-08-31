'use client'

import { type ReactNode, type RefObject, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  LiquidOrbIcon,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  SvgIcon,
  SuggestionPromptButton,
  type SuggestionPrompt,
} from '@/components/atoms'
import {
  ChatInput,
  ChatInputActions,
  ChatMessage,
  type AssistantContentPart,
  type ToolCallPreview,
} from '@/components/molecules'
import {
  ArrowDown,
  BrainCircuit,
  Check,
  ChevronDown,
  ImageIcon,
  RefreshCw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTION_BATCH_SIZE = 4

function getVisibleSuggestions<T>(items: T[], seed: number, batchSize: number) {
  if (items.length <= batchSize) return items
  const start = (seed * batchSize) % items.length
  return Array.from({ length: batchSize }).map((_, index) => {
    return items[(start + index) % items.length]
  })
}

function getModelIconName(modelKey: string) {
  if (modelKey.startsWith('gemini-') || modelKey.startsWith('google/gemini-')) {
    return 'chat-models-gemini'
  }
  if (modelKey.startsWith('openai/') || modelKey.startsWith('gpt-')) {
    return 'chat-models-openai'
  }
  if (modelKey.startsWith('deepseek-')) return 'chat-models-deepseek'
  if (modelKey.startsWith('qwen')) return 'chat-models-qwen'
  if (modelKey.startsWith('glm-')) return 'chat-models-glm'
  return 'chat-models-seed'
}

function ModelIcon({ modelKey }: { modelKey: string }) {
  return <SvgIcon name={getModelIconName(modelKey)} size={14} />
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  runId?: string | null
  images?: string[]
  contentParts?: AssistantContentPart[]
  toolCalls?: ToolCallPreview[]
  modelLabel?: string
  createdAt?: Date
  isVoiceTranscript?: boolean
}

export interface ChatModelOption {
  model: string
  label: string
  provider: 'deepseek' | 'seed' | 'bailian' | 'gcloud' | 'openai' | 'shortapi'
  isReasoning: boolean
  supportVision?: boolean
  supportReasoningControl?: boolean
}

export interface ChatContainerProps {
  selectedModel: string
  modelOptions: ChatModelOption[]
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high'
  // State
  messages: Message[]
  input: string
  isLoading: boolean
  activeAssistantId?: string | null
  copiedId: string | null
  suggestionPrompts: SuggestionPrompt[]
  lastUserMessage: string
  // Refs
  scrollRef: RefObject<HTMLDivElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  // Callbacks
  onInputChange: (value: string) => void
  onSend: (messageContent?: string) => void
  onStop: () => void
  onRetry: (runId: string) => void
  onCopy: (content: string, id: string) => void
  onClear: () => void
  onScrollToBottom: () => void
  onModelChange: (model: string) => void
  onReasoningEffortChange: (
    value: 'minimal' | 'low' | 'medium' | 'high'
  ) => void
  onPickImages?: (files: FileList | File[] | null) => void
  onRemoveImage?: (index: number) => void
  // Text
  modelLabel: string
  modelEmptyLabel: string
  modelReasoningLabel: string
  modelGroupDeepseekLabel?: string
  modelGroupSeedLabel?: string
  modelGroupBailianLabel?: string
  modelGroupGcloudLabel?: string
  modelGroupOpenAILabel?: string
  modelGroupShortApiLabel?: string
  reasoningEffortLabel: string
  reasoningEffortMinimal: string
  reasoningEffortLow: string
  reasoningEffortMedium: string
  reasoningEffortHigh: string
  // Plan 模式相关
  planMode: 'auto' | 'plan'
  onPlanModeChange: (value: 'auto' | 'plan') => void
  planLabel: string
  autoLabel: string
  planTitle: string
  planApproveLabel: string
  planRejectLabel: string
  planApprovedLabel: string
  planRejectedLabel: string
  planPendingLabel: string
  planCompletedLabel: string
  planFailedLabel: string
  executingLabel?: string
  /** 当前待批准计划所在的消息 id（用于决定哪条消息显示批准按钮） */
  pendingPlanMessageId: string | null
  onApprovePlan: () => void
  onRejectPlan: () => void
  clearConversationLabel: string
  /** 计划面板（贴在输入框上方） */
  planPanel?: ReactNode
  /** 澄清问题面板（临时悬浮在输入框上方，不进入消息流） */
  clarificationPanel?: ReactNode
  refreshSuggestionsLabel: string
  scrollToBottomLabel: string
  inputPlaceholder: string
  sendAriaLabel: string
  stopAriaLabel?: string
  disclaimer: string
  emptyStateTitle: string
  emptyStateDescription: string
  copyLabel: string
  copiedLabel: string
  retryLabel: string
  usedModelLabel: string
  reasoningTitle: string
  reasoningThinkingLabel: string
  reasoningDoneLabel: string
  imagePreviewLabel?: string
  imagePrevLabel?: string
  imageNextLabel?: string
  imageUploadLabel?: string
  imageUploadDisabledLabel?: string
  imageUploadingLabel?: string
  imageDropLabel?: string
  imageRemoveLabel?: string
  showScrollToBottom: boolean
  showReasoningEffort?: boolean
  showReasoningControl?: boolean
  showImageUpload?: boolean
  imagePreviews?: string[]
  disableModelSelect?: boolean
  disableReasoningEffort?: boolean
  isUploadingImages?: boolean
  toolbarLeading?: ReactNode
  realtimeStatusPanel?: ReactNode
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
}

export function ChatContainer({
  selectedModel,
  modelOptions,
  reasoningEffort,
  messages,
  input,
  isLoading,
  activeAssistantId,
  copiedId,
  suggestionPrompts,
  lastUserMessage,
  scrollRef,
  textareaRef,
  onInputChange,
  onSend,
  onStop,
  onRetry,
  onCopy,
  onClear,
  onScrollToBottom,
  onModelChange,
  onReasoningEffortChange,
  onPickImages,
  onRemoveImage,
  modelLabel,
  modelEmptyLabel,
  modelReasoningLabel,
  modelGroupDeepseekLabel = 'DeepSeek',
  modelGroupSeedLabel = 'Seed',
  modelGroupBailianLabel = 'Bailian',
  modelGroupGcloudLabel = 'Google Gemini',
  modelGroupOpenAILabel = 'OpenAI',
  modelGroupShortApiLabel = 'ShortAPI',
  reasoningEffortLabel,
  reasoningEffortMinimal,
  reasoningEffortLow,
  reasoningEffortMedium,
  reasoningEffortHigh,
  planMode,
  onPlanModeChange,
  planLabel,
  autoLabel,
  planTitle,
  planApproveLabel,
  planRejectLabel,
  planApprovedLabel,
  planRejectedLabel,
  planPendingLabel,
  planCompletedLabel,
  planFailedLabel,
  pendingPlanMessageId,
  onApprovePlan,
  onRejectPlan,
  clearConversationLabel,
  planPanel,
  clarificationPanel,
  refreshSuggestionsLabel,
  scrollToBottomLabel,
  inputPlaceholder,
  sendAriaLabel,
  stopAriaLabel = 'Stop generating',
  disclaimer,
  emptyStateTitle,
  emptyStateDescription,
  copyLabel,
  copiedLabel,
  retryLabel,
  usedModelLabel,
  reasoningTitle,
  reasoningThinkingLabel,
  reasoningDoneLabel,
  imagePreviewLabel = 'Preview image',
  imagePrevLabel = 'Previous image',
  imageNextLabel = 'Next image',
  imageUploadLabel = 'Upload image',
  imageUploadDisabledLabel = 'The selected model cannot view images',
  imageUploadingLabel = 'Uploading image',
  imageDropLabel = 'Drop images here',
  imageRemoveLabel = 'Remove image',
  showScrollToBottom,
  showReasoningEffort = false,
  showReasoningControl = false,
  showImageUpload = false,
  imagePreviews = [],
  disableModelSelect = false,
  disableReasoningEffort = false,
  isUploadingImages = false,
  toolbarLeading,
  realtimeStatusPanel,
  userAvatarUrl,
  userInitials,
}: ChatContainerProps) {
  const [suggestionSeed, setSuggestionSeed] = useState(0)

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!showImageUpload || isLoading || isUploadingImages) return
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          imageFiles.push(file)
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      onPickImages?.(imageFiles)
    }
  }
  const visibleSuggestions = useMemo(
    () =>
      getVisibleSuggestions(
        suggestionPrompts,
        suggestionSeed,
        SUGGESTION_BATCH_SIZE
      ),
    [suggestionPrompts, suggestionSeed]
  )
  const safeInput = input ?? ''
  const selectedModelOption = useMemo(
    () => modelOptions.find(option => option.model === selectedModel),
    [modelOptions, selectedModel]
  )
  const groupedModelOptions = useMemo(
    () => ({
      deepseek: modelOptions.filter(option => option.provider === 'deepseek'),
      seed: modelOptions.filter(option => option.provider === 'seed'),
      bailian: modelOptions.filter(option => option.provider === 'bailian'),
      gcloud: modelOptions.filter(option => option.provider === 'gcloud'),
      openai: modelOptions.filter(option => option.provider === 'openai'),
      shortapi: modelOptions.filter(option => option.provider === 'shortapi'),
    }),
    [modelOptions]
  )

  const handleShuffle = () => {
    setSuggestionSeed(prev => prev + 1)
  }

  // 当前模型对应的推理级别标签（仅在推理开启时用于 trigger）
  const reasoningEffortLabelMap: Record<
    'minimal' | 'low' | 'medium' | 'high',
    string
  > = {
    minimal: reasoningEffortMinimal,
    low: reasoningEffortLow,
    medium: reasoningEffortMedium,
    high: reasoningEffortHigh,
  }

  const providerGroups: Array<{
    key: string
    label?: string
    options: ChatModelOption[]
  }> = [
    {
      key: 'deepseek',
      label: modelGroupDeepseekLabel,
      options: groupedModelOptions.deepseek,
    },
    {
      key: 'seed',
      label: modelGroupSeedLabel,
      options: groupedModelOptions.seed,
    },
    {
      key: 'bailian',
      label: modelGroupBailianLabel,
      options: groupedModelOptions.bailian,
    },
    {
      key: 'gcloud',
      label: modelGroupGcloudLabel,
      options: groupedModelOptions.gcloud,
    },
    {
      key: 'openai',
      label: modelGroupOpenAILabel,
      options: groupedModelOptions.openai,
    },
    {
      key: 'shortapi',
      label: modelGroupShortApiLabel,
      options: groupedModelOptions.shortapi,
    },
  ]

  const reasoningLevels: Array<'minimal' | 'low' | 'medium' | 'high'> = [
    'minimal',
    'low',
    'medium',
    'high',
  ]

  // 合并后的「模型 + 推理强度」紧凑选择器（Codex 风格）
  // - 模型项点击即选中并关闭菜单
  // - 推理强度作为子菜单：hover 时向右侧展开 Off/Low/Medium/High
  const modelReasoningPicker = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          disabled={disableModelSelect}
          aria-label={modelLabel}
          className='inline-flex h-8 max-w-[240px] shrink-0 items-center gap-1.5 rounded-lg bg-transparent px-2.5 font-mono text-[10px] font-normal text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {selectedModelOption ? (
            <>
              <ModelIcon modelKey={selectedModelOption.model} />
              <span className='truncate'>{selectedModelOption.label}</span>
              {showReasoningEffort && reasoningEffort !== 'minimal' && (
                <span className='inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[9px] leading-none text-accent-foreground'>
                  <BrainCircuit className='size-2.5' />
                  {reasoningEffortLabelMap[reasoningEffort]}
                </span>
              )}
            </>
          ) : (
            <span className='truncate text-muted-foreground'>
              {modelEmptyLabel}
            </span>
          )}
          <ChevronDown className='size-3 shrink-0 opacity-60' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        side='top'
        className='w-[280px] max-w-[calc(100vw-2rem)] rounded-xl border-border p-1.5 shadow-xl'
      >
        <div className='max-h-[280px] overflow-y-auto p-0.5'>
          {providerGroups.map(
            group =>
              group.options.length > 0 && (
                <DropdownMenuGroup key={group.key}>
                  {group.label && (
                    <DropdownMenuLabel className='px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground'>
                      {group.label}
                    </DropdownMenuLabel>
                  )}
                  {group.options.map(option => {
                    const active = option.model === selectedModel
                    return (
                      <DropdownMenuItem
                        key={option.model}
                        onSelect={() => onModelChange(option.model)}
                        className='gap-2 rounded-lg px-2 py-2 text-xs'
                      >
                        <span className='flex min-w-0 flex-1 items-center gap-1.5'>
                          <ModelIcon modelKey={option.model} />
                          <span className='truncate'>{option.label}</span>
                          {option.supportVision && (
                            <span
                              className='inline-flex shrink-0 text-muted-foreground/75'
                              aria-label={imageUploadLabel}
                              title={imageUploadLabel}
                            >
                              <ImageIcon className='size-3' />
                            </span>
                          )}
                        </span>
                        {active && (
                          <Check className='size-3.5 shrink-0 text-primary' />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
              )
          )}
        </div>

        {showReasoningEffort && (
          <>
            <DropdownMenuSeparator className='my-1' />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={disableReasoningEffort}
                className='gap-2 px-2 py-1.5 text-xs'
              >
                <BrainCircuit className='size-3.5 shrink-0' />
                <span>{reasoningEffortLabel}</span>
                <span className='ml-auto pl-2 text-[10px] text-muted-foreground'>
                  {reasoningEffortLabelMap[reasoningEffort]}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className='min-w-[7rem] p-1'>
                {reasoningLevels.map(level => {
                  const active = reasoningEffort === level
                  return (
                    <DropdownMenuItem
                      key={level}
                      onSelect={e => {
                        e.preventDefault()
                        onReasoningEffortChange(level)
                      }}
                      className='gap-2 px-2 py-1.5 text-xs'
                    >
                      <span className='flex-1'>
                        {reasoningEffortLabelMap[level]}
                      </span>
                      {active && (
                        <Check className='size-3.5 shrink-0 text-primary' />
                      )}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className='relative flex h-full w-full flex-col overflow-hidden bg-transparent'>
      {/* Messages Area */}
      <div className='relative z-20 flex-1 min-h-0'>
        <div className='h-full min-h-0 overflow-y-auto' ref={scrollRef}>
          <div className='mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10'>
            {messages.length === 0 ? (
              <div className='mx-auto flex min-h-[58vh] max-w-2xl flex-col justify-center py-10'>
                <div className='mb-8'>
                  <div className='mb-6 flex w-full items-center justify-center'>
                    <LiquidOrbIcon className='size-16' />
                  </div>
                  <h2 className='text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-4xl'>
                    {emptyStateTitle}
                  </h2>
                  <p className='mt-3 max-w-xl text-pretty text-[14px] leading-6 text-muted-foreground'>
                    {emptyStateDescription}
                  </p>
                </div>

                <div>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {visibleSuggestions.map(suggestion => (
                      <SuggestionPromptButton
                        key={`${suggestion.label}-${suggestionSeed}`}
                        suggestion={suggestion}
                        onClick={onSend}
                        className='animate-in fade-in slide-in-from-bottom-1 duration-300'
                      />
                    ))}
                  </div>
                  {suggestionPrompts.length > SUGGESTION_BATCH_SIZE && (
                    <div className='mt-3 flex justify-start'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={handleShuffle}
                        className='h-8 gap-1.5 rounded-lg px-2 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground'
                      >
                        <RefreshCw className='mr-1 size-3' />
                        {refreshSuggestionsLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='space-y-10 pb-4'>
                {messages.map(message => {
                  const lastAssistantMessage = [...messages]
                    .reverse()
                    .find(m => m.role === 'assistant')
                  const isLastAssistantMessage =
                    message.role === 'assistant' &&
                    message.id === lastAssistantMessage?.id &&
                    message.id === messages[messages.length - 1]?.id
                  const isCurrentGenerating =
                    message.id === activeAssistantId ||
                    message.id === 'pending-assistant'
                  const showRetry =
                    isLastAssistantMessage &&
                    lastUserMessage &&
                    Boolean(message.runId) &&
                    message.id !== activeAssistantId

                  return (
                    <ChatMessage
                      key={message.id}
                      id={message.id}
                      role={message.role}
                      content={message.content}
                      images={message.images}
                      contentParts={message.contentParts}
                      toolCalls={message.toolCalls}
                      copiedId={copiedId}
                      onCopy={onCopy}
                      copyLabel={copyLabel}
                      copiedLabel={copiedLabel}
                      isLoading={isCurrentGenerating}
                      onRetry={
                        showRetry && message.runId
                          ? () => onRetry(message.runId!)
                          : undefined
                      }
                      retryLabel={retryLabel}
                      assistantModelLabel={message.modelLabel}
                      usedModelLabel={usedModelLabel}
                      reasoningTitle={reasoningTitle}
                      reasoningThinkingLabel={reasoningThinkingLabel}
                      reasoningDoneLabel={reasoningDoneLabel}
                      imagePreviewLabel={imagePreviewLabel}
                      imagePrevLabel={imagePrevLabel}
                      imageNextLabel={imageNextLabel}
                      userAvatarUrl={userAvatarUrl}
                      userInitials={userInitials}
                      isVoiceTranscript={message.isVoiceTranscript}
                      planTitle={planTitle}
                      planApproveLabel={planApproveLabel}
                      planRejectLabel={planRejectLabel}
                      planApprovedLabel={planApprovedLabel}
                      planRejectedLabel={planRejectedLabel}
                      planPendingLabel={planPendingLabel}
                      planCompletedLabel={planCompletedLabel}
                      planFailedLabel={planFailedLabel}
                      isPendingPlan={message.id === pendingPlanMessageId}
                      onApprovePlan={onApprovePlan}
                      onRejectPlan={onRejectPlan}
                    />
                  )
                })}
                {!isLoading && (
                  <div className='flex justify-center pt-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={onClear}
                      className='text-[11px] text-muted-foreground hover:text-foreground'
                    >
                      {clearConversationLabel}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 transition-all duration-200',
            showScrollToBottom
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          )}
        >
          <Button
            type='button'
            variant='outline'
            size='icon'
            radius='full'
            onClick={onScrollToBottom}
            aria-label={scrollToBottomLabel}
            title={scrollToBottomLabel}
            className={cn(
              'size-9 bg-background/95 text-foreground shadow-xl backdrop-blur hover:bg-muted',
              showScrollToBottom ? 'pointer-events-auto' : 'pointer-events-none'
            )}
          >
            <ArrowDown className='size-4' />
          </Button>
        </div>
      </div>

      {/* Input Area */}
      <div className='relative z-30 shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-5 backdrop-blur-[2px]'>
        <div className='mx-auto max-w-4xl px-4 pb-4 sm:px-6'>
          {realtimeStatusPanel && (
            <div className='mb-2'>{realtimeStatusPanel}</div>
          )}
          {planPanel && <div className='mb-2'>{planPanel}</div>}
          {clarificationPanel && (
            <div className='relative z-40 mb-3'>{clarificationPanel}</div>
          )}
          <ChatInput
            ref={textareaRef}
            value={safeInput}
            onChange={e => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            onSend={onSend}
            onStop={onStop}
            canSend={
              safeInput.trim().length > 0 ||
              (showImageUpload && imagePreviews.length > 0)
            }
            isLoading={isLoading && !clarificationPanel}
            disabled={Boolean(clarificationPanel)}
            sendDisabled={
              isLoading || isUploadingImages || Boolean(clarificationPanel)
            }
            sendAriaLabel={sendAriaLabel}
            stopAriaLabel={stopAriaLabel}
            onPaste={handlePaste}
            imageDropEnabled={
              showImageUpload && !isLoading && !isUploadingImages
            }
            imageDropLabel={imageDropLabel}
            onDropImages={files => onPickImages?.(files)}
            attachments={
              imagePreviews.length > 0 ? (
                <div className='flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5'>
                  {imagePreviews.map((src, index) => (
                    <div
                      key={`${src.slice(0, 36)}-${index}`}
                      className='group relative size-14 shrink-0 overflow-visible rounded-lg ring-1 ring-border/70'
                    >
                      <Image
                        src={src}
                        alt={`${imageUploadLabel}-${index + 1}`}
                        fill
                        unoptimized
                        sizes='56px'
                        className='rounded-lg object-cover'
                      />
                      <button
                        type='button'
                        onClick={() => onRemoveImage?.(index)}
                        className='absolute -right-1.5 -top-1.5 inline-flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-md ring-2 ring-background transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
                        aria-label={imageRemoveLabel}
                        title={imageRemoveLabel}
                      >
                        <X className='size-3' />
                      </button>
                    </div>
                  ))}
                </div>
              ) : undefined
            }
            actions={
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <ChatInputActions
                  showImageUpload
                  showReasoningEffort={false}
                  imageUploadLabel={imageUploadLabel}
                  imageUploadDisabledLabel={imageUploadDisabledLabel}
                  imageUploadingLabel={imageUploadingLabel}
                  imageUploadSupported={showImageUpload}
                  disableImageUpload={
                    !showImageUpload || isLoading || isUploadingImages
                  }
                  isUploadingImages={isUploadingImages}
                  reasoningEffort={reasoningEffort}
                  reasoningEffortLabel={reasoningEffortLabel}
                  reasoningEffortMinimal={reasoningEffortMinimal}
                  reasoningEffortLow={reasoningEffortLow}
                  reasoningEffortMedium={reasoningEffortMedium}
                  reasoningEffortHigh={reasoningEffortHigh}
                  disableReasoningEffort={disableReasoningEffort}
                  onPickImages={onPickImages}
                  onReasoningEffortChange={onReasoningEffortChange}
                />
                {toolbarLeading}
                {modelReasoningPicker}
                <ChatInputActions
                  showImageUpload={false}
                  showReasoningEffort={false}
                  imageUploadLabel={imageUploadLabel}
                  reasoningEffort={reasoningEffort}
                  reasoningEffortLabel={reasoningEffortLabel}
                  reasoningEffortMinimal={reasoningEffortMinimal}
                  reasoningEffortLow={reasoningEffortLow}
                  reasoningEffortMedium={reasoningEffortMedium}
                  reasoningEffortHigh={reasoningEffortHigh}
                  disableReasoningEffort={disableReasoningEffort}
                  onPickImages={onPickImages}
                  onReasoningEffortChange={onReasoningEffortChange}
                  showPlanMode
                  planMode={planMode}
                  planLabel={planLabel}
                  autoLabel={autoLabel}
                  disablePlanMode={disableReasoningEffort}
                  onPlanModeChange={onPlanModeChange}
                />
              </div>
            }
          />
          <p className='mt-2.5 text-center font-mono text-[9px] text-muted-foreground/75'>
            {disclaimer}
          </p>
        </div>
      </div>
    </div>
  )
}
