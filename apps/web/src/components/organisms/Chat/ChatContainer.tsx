'use client'

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  AiLottieIcon,
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
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
import { ArrowDown, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const CARD_TILTS = ['-5deg', '3.5deg', '0deg', '-3deg', '5deg', '2deg'] as const
const GRADIENT_POOL = [
  ['#4285F4', '#FFFFFF'],
  ['#9B51E0', '#FFFFFF'],
  ['#34A853', '#FFFFFF'],
  ['#C8B27C', '#FFFFFF'],
  ['#4285F4', '#9B51E0', '#FFFFFF'],
  ['#9B51E0', '#34A853', '#FFFFFF'],
] as const

const SUGGESTION_BATCH_SIZE = 4
const SHUFFLE_COLLAPSE_MS = 180
const SHUFFLE_END_MS = 300

function getVisibleSuggestions<T>(items: T[], seed: number, batchSize: number) {
  if (items.length <= batchSize) return items
  const start = (seed * batchSize) % items.length
  return Array.from({ length: batchSize }).map((_, index) => {
    return items[(start + index) % items.length]
  })
}

function getCardGradient(index: number, isDark: boolean) {
  const colors = GRADIENT_POOL[index % GRADIENT_POOL.length]
  const whiteStop = isDark ? '#323546' : '#FFFFFF'
  const alphaStrong = isDark ? '3d' : '26'
  const alphaSoft = isDark ? '2c' : '22'
  const alphaMid = isDark ? '34' : '24'

  if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]}${alphaStrong} 0%, ${whiteStop} 100%)`
  }

  return `linear-gradient(135deg, ${colors[0]}${alphaSoft} 0%, ${colors[1]}${alphaMid} 45%, ${whiteStop} 100%)`
}

function getCardTransform(
  index: number,
  isShuffling: boolean,
  isHovered: boolean
) {
  const spreadX = (index - 1.5) * 180
  const spreadY = index % 2 === 0 ? -10 : 10
  const tilt = CARD_TILTS[index % CARD_TILTS.length]
  const offset = isShuffling ? { x: 0, y: 0 } : { x: spreadX, y: spreadY }
  const rotation = isHovered ? '0deg' : tilt

  return `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation})`
}

function getModelIconName(modelKey: string) {
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
  images?: string[]
  contentParts?: AssistantContentPart[]
  toolCalls?: ToolCallPreview[]
  modelLabel?: string
  createdAt?: Date
}

export interface ChatModelOption {
  model: string
  label: string
  provider: 'deepseek' | 'seed' | 'bailian'
  isReasoning: boolean
}

export interface ChatContainerProps {
  selectedModel: string
  modelOptions: ChatModelOption[]
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high'
  // State
  messages: Message[]
  input: string
  isLoading: boolean
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
  onRetry: () => void
  onCopy: (content: string, id: string) => void
  onClear: () => void
  onScrollToBottom: () => void
  onModelChange: (model: string) => void
  onReasoningEffortChange: (
    value: 'minimal' | 'low' | 'medium' | 'high'
  ) => void
  onPickImages?: (files: FileList | null) => void
  onRemoveImage?: (index: number) => void
  // Text
  modelLabel: string
  modelEmptyLabel: string
  modelReasoningLabel: string
  modelGroupDeepseekLabel?: string
  modelGroupSeedLabel?: string
  modelGroupBailianLabel?: string
  reasoningEffortLabel: string
  reasoningEffortMinimal: string
  reasoningEffortLow: string
  reasoningEffortMedium: string
  reasoningEffortHigh: string
  clearConversationLabel: string
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
  imageRemoveLabel?: string
  showScrollToBottom: boolean
  showReasoningEffort?: boolean
  showImageUpload?: boolean
  imagePreviews?: string[]
  disableModelSelect?: boolean
  disableReasoningEffort?: boolean
  isUploadingImages?: boolean
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
  reasoningEffortLabel,
  reasoningEffortMinimal,
  reasoningEffortLow,
  reasoningEffortMedium,
  reasoningEffortHigh,
  clearConversationLabel,
  refreshSuggestionsLabel,
  scrollToBottomLabel,
  inputPlaceholder,
  sendAriaLabel,
  stopAriaLabel = '停止生成',
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
  imageRemoveLabel = 'Remove image',
  showScrollToBottom,
  showReasoningEffort = false,
  showImageUpload = false,
  imagePreviews = [],
  disableModelSelect = false,
  disableReasoningEffort = false,
  isUploadingImages = false,
  userAvatarUrl,
  userInitials,
}: ChatContainerProps) {
  const [suggestionSeed, setSuggestionSeed] = useState(0)
  const [isShuffling, setIsShuffling] = useState(false)
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(
    null
  )
  const shuffleTimeoutRef = useRef<number | null>(null)
  const shuffleEndRef = useRef<number | null>(null)
  const visibleSuggestions = useMemo(
    () =>
      getVisibleSuggestions(
        suggestionPrompts,
        suggestionSeed,
        SUGGESTION_BATCH_SIZE
      ),
    [suggestionPrompts, suggestionSeed]
  )
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const update = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

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
    }),
    [modelOptions]
  )

  useEffect(() => {
    return () => {
      if (shuffleTimeoutRef.current) {
        window.clearTimeout(shuffleTimeoutRef.current)
      }
      if (shuffleEndRef.current) {
        window.clearTimeout(shuffleEndRef.current)
      }
    }
  }, [])

  const handleShuffle = () => {
    if (isShuffling) return
    setIsShuffling(true)
    shuffleTimeoutRef.current = window.setTimeout(() => {
      setSuggestionSeed(prev => prev + 1)
    }, SHUFFLE_COLLAPSE_MS)
    shuffleEndRef.current = window.setTimeout(() => {
      setIsShuffling(false)
    }, SHUFFLE_END_MS)
  }
  return (
    <div className='relative flex h-full w-full flex-col overflow-hidden bg-background'>
      <div className='absolute right-4 top-4 z-30'>
        <div className='flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 shadow-sm ring-1 ring-border/60 backdrop-blur'>
          <span className='text-[11px] text-muted-foreground'>
            {modelLabel}
          </span>
          <Select
            value={selectedModel || undefined}
            onValueChange={onModelChange}
            disabled={disableModelSelect}
          >
            <SelectTrigger
              size='sm'
              className='h-7 w-[220px] rounded-md border-border/70 bg-transparent text-xs shadow-none'
            >
              {selectedModelOption ? (
                <span className='flex min-w-0 items-center gap-1.5'>
                  <ModelIcon modelKey={selectedModelOption.model} />
                  <span className='truncate'>{selectedModelOption.label}</span>
                </span>
              ) : (
                <SelectValue placeholder={modelEmptyLabel} />
              )}
            </SelectTrigger>
            <SelectContent>
              {groupedModelOptions.deepseek.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{modelGroupDeepseekLabel}</SelectLabel>
                  {groupedModelOptions.deepseek.map(option => (
                    <SelectItem key={option.model} value={option.model}>
                      <div className='flex w-full items-center justify-between gap-2'>
                        <span className='flex items-center gap-1.5'>
                          <ModelIcon modelKey={option.model} />
                          {option.label}
                        </span>
                        {option.isReasoning && (
                          <span className='text-[10px] text-muted-foreground'>
                            {modelReasoningLabel}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {groupedModelOptions.seed.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{modelGroupSeedLabel}</SelectLabel>
                  {groupedModelOptions.seed.map(option => (
                    <SelectItem key={option.model} value={option.model}>
                      <div className='flex w-full items-center justify-between gap-2'>
                        <span className='flex items-center gap-1.5'>
                          <ModelIcon modelKey={option.model} />
                          {option.label}
                        </span>
                        {option.isReasoning && (
                          <span className='text-[10px] text-muted-foreground'>
                            {modelReasoningLabel}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {groupedModelOptions.bailian.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{modelGroupBailianLabel}</SelectLabel>
                  {groupedModelOptions.bailian.map(option => (
                    <SelectItem key={option.model} value={option.model}>
                      <div className='flex w-full items-center justify-between gap-2'>
                        <span className='flex items-center gap-1.5'>
                          <ModelIcon modelKey={option.model} />
                          {option.label}
                        </span>
                        {option.isReasoning && (
                          <span className='text-[10px] text-muted-foreground'>
                            {modelReasoningLabel}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute -top-48 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(66,133,244,0.1),transparent_65%)] blur-3xl' />
        <div className='absolute top-24 right-[-12%] h-[520px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(155,81,224,0.1),transparent_65%)] blur-3xl' />
        <div className='absolute bottom-[-10%] left-[-18%] h-[520px] w-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.08),transparent_65%)] blur-3xl' />
      </div>
      {/* Messages Area */}
      <div className='relative z-20 flex-1 min-h-0'>
        <div className='h-full min-h-0 overflow-y-auto' ref={scrollRef}>
          <div className='mx-auto max-w-4xl px-4 py-10'>
            {messages.length === 0 ? (
              <div className='flex min-h-[50vh] flex-col items-center justify-center py-10'>
                <div className='mb-8 text-center'>
                  <div className='mb-4 inline-flex items-center justify-center'>
                    <AiLottieIcon className='size-20' />
                  </div>
                  <h2 className='mb-2 text-xl font-semibold'>
                    {emptyStateTitle}
                  </h2>
                  <p className='text-sm text-muted-foreground'>
                    {emptyStateDescription}
                  </p>
                </div>

                <div className='mt-6 w-[min(1200px,95vw)]'>
                  <div
                    className={cn('relative flex justify-center', 'h-[200px]')}
                  >
                    {visibleSuggestions.map((suggestion, index) => {
                      const hoverKey = `${suggestion.label}-${index}`
                      const isHovered = hoveredSuggestion === hoverKey
                      const gradient = getCardGradient(index, isDark)
                      const transform = getCardTransform(
                        index,
                        isShuffling,
                        isHovered
                      )

                      return (
                        <SuggestionPromptButton
                          key={`${suggestion.label}-${suggestionSeed}`}
                          suggestion={suggestion}
                          onClick={onSend}
                          onMouseEnter={() => setHoveredSuggestion(hoverKey)}
                          onMouseLeave={() => setHoveredSuggestion(null)}
                          className={cn(
                            'absolute left-1/2 top-1/2 will-change-transform transition-all duration-300 ease-out',
                            isShuffling
                              ? 'scale-[0.5] opacity-10'
                              : 'opacity-100'
                          )}
                          style={{
                            transform,
                            backgroundImage: gradient,
                            zIndex: isHovered ? 50 : index,
                          }}
                        />
                      )
                    })}
                  </div>
                  {suggestionPrompts.length > SUGGESTION_BATCH_SIZE && (
                    <div className='mt-6 flex justify-center'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={handleShuffle}
                        className='text-[11px] text-muted-foreground hover:text-foreground'
                      >
                        <RefreshCw className='mr-1 size-3' />
                        {refreshSuggestionsLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='space-y-8'>
                {messages.map(message => {
                  const isLastAssistantMessage =
                    message.role === 'assistant' &&
                    message.id === messages[messages.length - 1]?.id
                  const showRetry = isLastAssistantMessage && lastUserMessage

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
                      isLoading={isLastAssistantMessage && isLoading}
                      onRetry={showRetry ? onRetry : undefined}
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
      <div className='shrink-0 bg-transparent backdrop-blur-lg relative z-10'>
        <div className='mx-auto max-w-4xl px-4 py-4'>
          {showImageUpload && imagePreviews.length > 0 && (
            <div className='mb-2 flex items-center gap-2 overflow-x-auto py-2'>
              {imagePreviews.map((src, index) => (
                <div
                  key={`${src.slice(0, 36)}-${index}`}
                  className='relative h-12 w-12 shrink-0 rounded-md ring-1 ring-border/70'
                >
                  <Image
                    src={src}
                    alt={`${imageUploadLabel}-${index + 1}`}
                    fill
                    unoptimized
                    sizes='48px'
                    className='object-cover'
                  />
                  <button
                    type='button'
                    onClick={() => onRemoveImage?.(index)}
                    className='absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border cursor-pointer hover:scale-110 transition-transform duration-300'
                    aria-label={imageRemoveLabel}
                    title={imageRemoveLabel}
                  >
                    <X className='size-2.5' />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ChatInput
            ref={textareaRef}
            value={safeInput}
            onChange={e => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            onSend={onSend}
            onStop={onStop}
            canSend={safeInput.trim().length > 0 || imagePreviews.length > 0}
            isLoading={isLoading}
            sendDisabled={isLoading || isUploadingImages}
            sendAriaLabel={sendAriaLabel}
            stopAriaLabel={stopAriaLabel}
            actions={
              <ChatInputActions
                showImageUpload={showImageUpload}
                showReasoningEffort={showReasoningEffort}
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
              />
            }
          />
          <p className='mt-2 text-center text-[11px] text-muted-foreground'>
            {disclaimer}
          </p>
        </div>
      </div>
    </div>
  )
}
