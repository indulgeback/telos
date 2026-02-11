'use client'

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  SuggestionPromptButton,
  type SuggestionPrompt,
} from '@/components/atoms'
import { ChatInput, ChatMessage } from '@/components/molecules'
import { Bot, RefreshCw } from 'lucide-react'
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
const SHUFFLE_END_MS = 520

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

  return `translate(calc(-50% + ${offset.x}px), ${offset.y}px) rotate(${rotation})`
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}

export interface ChatContainerProps {
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
  onRetry: () => void
  onCopy: (content: string, id: string) => void
  onClear: () => void
  // Text
  clearConversationLabel: string
  refreshSuggestionsLabel: string
  inputPlaceholder: string
  sendAriaLabel: string
  disclaimer: string
  emptyStateTitle: string
  emptyStateDescription: string
  copyLabel: string
  copiedLabel: string
  retryLabel: string
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
}

export function ChatContainer({
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
  onRetry,
  onCopy,
  onClear,
  clearConversationLabel,
  refreshSuggestionsLabel,
  inputPlaceholder,
  sendAriaLabel,
  disclaimer,
  emptyStateTitle,
  emptyStateDescription,
  copyLabel,
  copiedLabel,
  retryLabel,
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
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute -top-48 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(66,133,244,0.1),transparent_65%)] blur-3xl' />
        <div className='absolute top-24 right-[-12%] h-[520px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(155,81,224,0.1),transparent_65%)] blur-3xl' />
        <div className='absolute bottom-[-10%] left-[-18%] h-[520px] w-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.08),transparent_65%)] blur-3xl' />
      </div>
      {/* Messages Area */}
      <div className='flex-1 overflow-y-auto relative z-10' ref={scrollRef}>
        <div className='mx-auto max-w-3xl px-4 py-10'>
          {messages.length === 0 ? (
            <div className='flex min-h-[70vh] flex-col items-center justify-center py-10'>
              <div className='mb-8 text-center'>
                <div className='mb-4 inline-flex size-16 items-center justify-center rounded-2xl border bg-card shadow-sm'>
                  <Bot className='size-8 text-foreground' />
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
                          'absolute left-1/2 top-0 will-change-transform transition-all duration-300 ease-out',
                          isShuffling
                            ? 'scale-[0.92] opacity-70'
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
                    copiedId={copiedId}
                    onCopy={onCopy}
                    copyLabel={copyLabel}
                    copiedLabel={copiedLabel}
                    isLoading={isLastAssistantMessage && isLoading}
                    onRetry={showRetry ? onRetry : undefined}
                    retryLabel={retryLabel}
                    userAvatarUrl={userAvatarUrl}
                    userInitials={userInitials}
                  />
                )
              })}
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
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className='shrink-0 bg-background/80 backdrop-blur-lg shadow-[0_-1px_0_rgba(0,0,0,0.04)] relative z-10'>
        <div className='mx-auto max-w-3xl px-4 py-4'>
          <ChatInput
            ref={textareaRef}
            value={safeInput}
            onChange={e => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            onSend={onSend}
            canSend={safeInput.trim().length > 0}
            sendDisabled={isLoading}
            sendAriaLabel={sendAriaLabel}
          />
          <p className='mt-2 text-center text-[11px] text-muted-foreground'>
            {disclaimer}
          </p>
        </div>
      </div>
    </div>
  )
}
