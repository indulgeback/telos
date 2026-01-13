'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/atoms'
import { Send, Sparkles, User, Bot, Copy, Check } from 'lucide-react'
import { Card } from '@/components/atoms/card'
import { Textarea } from '@/components/atoms/textarea'
import { Avatar } from '@/components/atoms/avatar'
import { cn } from '@/lib/utils'
import { agentService } from '@/service/agent'
import { useTranslations } from 'next-intl'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatContainer() {
  const t = useTranslations('Chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const suggestionPrompts = useMemo(
    () => [
      {
        icon: '🚀',
        label: t('suggestions.newProject.label'),
        prompt: t('suggestions.newProject.prompt'),
      },
      {
        icon: '🐛',
        label: t('suggestions.debugCode.label'),
        prompt: t('suggestions.debugCode.prompt'),
      },
      {
        icon: '📝',
        label: t('suggestions.writeDocs.label'),
        prompt: t('suggestions.writeDocs.prompt'),
      },
      {
        icon: '💡',
        label: t('suggestions.creativeIdeas.label'),
        prompt: t('suggestions.creativeIdeas.prompt'),
      },
    ],
    [t]
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = input.trim()
    setInput('')
    setIsLoading(true)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      await agentService.chatStream(
        messageContent,
        chunk => {
          if (chunk.done) {
            setIsLoading(false)
            textareaRef.current?.focus()
            return
          }
          if (chunk.content) {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: m.content + chunk.content }
                  : m
              )
            )
          }
        },
        error => {
          console.error('Chat error:', error)
          setIsLoading(false)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id && !m.content
                ? { ...m, content: t('error.message') }
                : m
            )
          )
        }
      )
    } catch (error) {
      console.error('Chat error:', error)
      setIsLoading(false)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id && !m.content
            ? { ...m, content: t('error.message') }
            : m
        )
      )
    }
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20'>
      {/* Header */}
      <div className='shrink-0 border-b bg-background/80 backdrop-blur-lg'>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10'>
              <Sparkles className='size-5 text-primary' />
            </div>
            <div>
              <h1 className='font-semibold'>{t('title')}</h1>
              <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
            </div>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setMessages([])}
            className='text-muted-foreground'
          >
            {t('clearConversation')}
          </Button>
        </div>
      </div>

      {/* Messages Area - 填充剩余空间，内部滚动 */}
      <div className='flex-1 overflow-y-auto' ref={scrollRef}>
        <div className='mx-auto max-w-3xl px-4 py-8'>
          {messages.length === 0 ? (
            <div className='flex min-h-full flex-col items-center justify-center'>
              <div className='mb-8 text-center'>
                <div className='mb-4 inline-flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5'>
                  <Bot className='size-10 text-primary' />
                </div>
                <h2 className='mb-2 text-2xl font-bold'>
                  {t('emptyState.title')}
                </h2>
                <p className='text-muted-foreground'>
                  {t('emptyState.description')}
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                {suggestionPrompts.map(suggestion => (
                  <button
                    key={suggestion.label}
                    onClick={() => setInput(suggestion.prompt)}
                    className={cn(
                      'group flex flex-col items-center rounded-xl border p-4 text-center',
                      'transition-all hover:border-primary/50 hover:bg-primary/5',
                      'active:scale-95'
                    )}
                  >
                    <span className='mb-2 text-2xl group-hover:scale-110 transition-transform'>
                      {suggestion.icon}
                    </span>
                    <span className='text-sm font-medium'>
                      {suggestion.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className='space-y-6'>
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className='size-8 shrink-0 border'>
                      <div className='flex size-full items-center justify-center bg-primary/10'>
                        <Bot className='size-4 text-primary' />
                      </div>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'flex max-w-[85%] flex-col gap-2',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <Card
                      className={cn(
                        'relative px-4 py-3 shadow-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50'
                      )}
                    >
                      <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
                        {message.content || (
                          <span className='flex items-center gap-1'>
                            <span className='inline-block size-2 animate-bounce rounded-full bg-current' />
                            <span className='inline-block size-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]' />
                            <span className='inline-block size-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]' />
                          </span>
                        )}
                      </p>
                    </Card>

                    {message.role === 'assistant' && message.content && (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-7 gap-1 px-2 text-xs text-muted-foreground'
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className='size-3' />
                            {t('actions.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className='size-3' />
                            {t('actions.copy')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className='size-8 shrink-0 border'>
                      <div className='flex size-full items-center justify-center bg-muted'>
                        <User className='size-4 text-muted-foreground' />
                      </div>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className='flex gap-4'>
                  <Avatar className='size-8 shrink-0 border'>
                    <div className='flex size-full items-center justify-center bg-primary/10'>
                      <Bot className='size-4 text-primary' />
                    </div>
                  </Avatar>
                  <Card className='bg-muted/50 px-4 py-3 shadow-sm'>
                    <span className='flex items-center gap-1'>
                      <span className='inline-block size-2 animate-bounce rounded-full bg-current' />
                      <span className='inline-block size-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]' />
                      <span className='inline-block size-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]' />
                    </span>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Area - 固定在底部 */}
      <div className='shrink-0 border-t bg-background/80 backdrop-blur-lg'>
        <div className='mx-auto max-w-3xl px-4 py-4'>
          <div className='flex items-end gap-3 rounded-2xl border bg-background p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20'>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('input.placeholder')}
              className='max-h-32 min-h-[44px] resize-none border-none bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0'
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size='icon'
              className='size-10 shrink-0 rounded-xl'
            >
              <Send className='size-4' />
            </Button>
          </div>
          <p className='mt-2 text-center text-xs text-muted-foreground'>
            {t('disclaimer')}
          </p>
        </div>
      </div>
    </div>
  )
}
