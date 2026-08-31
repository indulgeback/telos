/*
 * Vendored from https://www.beautifului.dev/ on 2026-08-31.
 * Beautiful UI is MIT licensed. The visual structure and motion are preserved;
 * the submit hooks are async so the harness can persist an answer before the
 * card enters its completed state.
 */
/* eslint-disable react-hooks/set-state-in-effect -- upstream rolling/height motion synchronizes measured layout into animation state. */
'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Button } from '@/components/atoms'
import GlideMenu from '@/components/primitives/GlideMenu'
import { cn } from '@/lib/utils'

export type ApprovalQuestion = {
  q: string
  type: 'radio' | 'check'
  options: string[]
}

export type ApprovalLabels = {
  skip: string
  continue: string
  send: string
  customPlaceholder: string
  sentMessage: string
  submitError: string
}

export interface ApprovalCardProps {
  questions: ApprovalQuestion[]
  labels?: Partial<ApprovalLabels>
  onSubmitted?: (
    answers: Record<number, number[]>,
    customAnswers: Record<number, string>
  ) => void | Promise<void>
  onAnswerChange?: (questionIndex: number, answer: number[]) => void
  onSkipped?: () => void | Promise<void>
  onDismissed?: () => void | Promise<void>
  initialSent?: boolean
  sentDetail?: string | null
  resettable?: boolean
  dismissible?: boolean
  variant?: 'compact' | 'composer'
  autoSubmitRadio?: boolean
  hideAfterSubmit?: boolean
}

const DEFAULT_LABELS: ApprovalLabels = {
  skip: 'Skip',
  continue: 'Continue',
  send: 'Send',
  customPlaceholder: 'Something else…',
  sentMessage: 'Answer sent',
  submitError: 'Could not send the answer. Try again.',
}

const ROLL_MS = 400
const SLIDE = '360ms cubic-bezier(0.22, 1, 0.36, 1)'

function RollingDigits({ value }: { value: string }) {
  const previousRef = useRef(value)
  const [oldValue, setOldValue] = useState(value)
  const [newValue, setNewValue] = useState(value)
  const [rolling, setRolling] = useState(false)
  const [shifted, setShifted] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  useEffect(() => {
    if (previousRef.current === value) return
    const from = previousRef.current
    previousRef.current = value
    const fromNumber = Number.parseInt(from, 10)
    const toNumber = Number.parseInt(value, 10)
    setDirection(
      Number.isFinite(fromNumber) &&
        Number.isFinite(toNumber) &&
        toNumber < fromNumber
        ? 'down'
        : 'up'
    )
    setOldValue(from)
    setNewValue(value)
    setRolling(true)
    setShifted(false)

    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setShifted(true))
    })
    const done = window.setTimeout(() => {
      setRolling(false)
      setOldValue(value)
      setShifted(false)
    }, ROLL_MS)

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      window.clearTimeout(done)
    }
  }, [value])

  const characters = rolling ? newValue : oldValue

  return (
    <>
      {Array.from({ length: characters.length }, (_, index) => {
        const oldCharacter = oldValue[index] ?? ''
        const newCharacter = characters[index] ?? ''
        if (!rolling || oldCharacter === newCharacter) {
          return <span key={`${index}-${newCharacter}`}>{newCharacter}</span>
        }
        const top = direction === 'down' ? newCharacter : oldCharacter
        const bottom = direction === 'down' ? oldCharacter : newCharacter
        const restY = direction === 'down' ? '0' : '-1em'
        const startY = direction === 'down' ? '-1em' : '0'
        return (
          <span
            key={`${index}-${oldCharacter}-${newCharacter}-${direction}`}
            style={{
              display: 'inline-block',
              position: 'relative',
              overflow: 'hidden',
              height: '1em',
              lineHeight: '1em',
              verticalAlign: '-0.05em',
            }}
          >
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                transform: `translateY(${shifted ? restY : startY})`,
              }}
            >
              <span style={{ height: '1em', lineHeight: '1em' }}>{top}</span>
              <span style={{ height: '1em', lineHeight: '1em' }}>{bottom}</span>
            </span>
          </span>
        )
      })}
    </>
  )
}

function Icon({
  path,
  size = 14,
  strokeWidth = 2,
}: {
  path: ReactNode
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      {path}
    </svg>
  )
}

export default function ApprovalCard({
  questions,
  labels,
  onSubmitted,
  onAnswerChange,
  onSkipped,
  onDismissed,
  initialSent = false,
  sentDetail,
  resettable = false,
  dismissible = true,
  variant = 'compact',
  autoSubmitRadio = true,
  hideAfterSubmit = false,
}: ApprovalCardProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({})
  const [sent, setSent] = useState(initialSent)
  const [open, setOpen] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])
  const measured = useRef(false)
  const [viewportHeight, setViewportHeight] = useState<number>()
  const [trackY, setTrackY] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [ready, setReady] = useState(false)

  const last = questionIndex === questions.length - 1
  const selected = answers[questionIndex] ?? []
  const hasAnswer =
    selected.length > 0 || Boolean(customAnswers[questionIndex]?.trim())

  const sync = (withAnimation: boolean) => {
    const item = questionRefs.current[questionIndex]
    if (!item) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setViewportHeight(item.offsetHeight)
    setTrackY(item.offsetTop)
    setAnimate(withAnimation && !reduce)
  }

  useLayoutEffect(() => {
    const withAnimation = measured.current
    measured.current = true
    sync(withAnimation)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, answers, customAnswers, open, sent])

  useEffect(() => {
    const frame = requestAnimationFrame(() => sync(measured.current))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex])

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    []
  )

  const goTo = (next: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setQuestionIndex(Math.min(Math.max(next, 0), questions.length - 1))
  }

  const send = async (
    nextAnswers = answers,
    nextCustomAnswers = customAnswers
  ) => {
    if (submitting) return
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmitted?.(nextAnswers, nextCustomAnswers)
      if (hideAfterSubmit) setOpen(false)
      else setSent(true)
    } catch (error) {
      console.error('Failed to submit approval answer:', error)
      setSubmitError(text.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  const advance = () => {
    if (last) void send()
    else goTo(questionIndex + 1)
  }

  const toggle = (optionIndex: number) => {
    const question = questions[questionIndex]
    const picked = answers[questionIndex] ?? []
    const next =
      question.type === 'radio'
        ? [optionIndex]
        : picked.includes(optionIndex)
          ? picked.filter(item => item !== optionIndex)
          : [...picked, optionIndex]
    const nextAnswers = { ...answers, [questionIndex]: next }
    const nextCustomAnswers = { ...customAnswers, [questionIndex]: '' }
    setAnswers(nextAnswers)
    onAnswerChange?.(questionIndex, next)

    if (question.type === 'radio') {
      setCustomAnswers(nextCustomAnswers)
      if (autoSubmitRadio) {
        if (advanceTimer.current) clearTimeout(advanceTimer.current)
        advanceTimer.current = setTimeout(() => {
          if (last) void send(nextAnswers, nextCustomAnswers)
          else
            setQuestionIndex(current =>
              Math.min(questions.length - 1, current + 1)
            )
        }, 480)
      }
    }
  }

  const skip = async () => {
    if (!last) {
      goTo(questionIndex + 1)
      return
    }
    if (!onSkipped) {
      setOpen(false)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSkipped()
      if (hideAfterSubmit) setOpen(false)
      else setSent(true)
    } catch (error) {
      console.error('Failed to skip approval question:', error)
      setSubmitError(text.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  const dismiss = async () => {
    if (!onDismissed) {
      setOpen(false)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onDismissed()
      setOpen(false)
    } catch (error) {
      console.error('Failed to dismiss approval question:', error)
      setSubmitError(text.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setQuestionIndex(0)
    setAnswers({})
    setCustomAnswers({})
    setSent(false)
    setOpen(true)
    setSubmitError(null)
    measured.current = false
  }

  if (!open) return null

  if (sent && hideAfterSubmit) return null

  if (sent) {
    return (
      <div
        data-approval-card='beautiful-ui'
        className={cn(
          'flex w-full items-center gap-3',
          variant === 'composer' ? 'max-w-none' : 'max-w-80'
        )}
        style={{
          animation: 'pop-in 260ms cubic-bezier(0.23,1,0.32,1) both',
        }}
      >
        <span className='inline-flex min-w-0 items-center gap-1.5 rounded-full bg-green-tint py-1 pr-2.5 pl-1 text-[12.5px] font-medium text-green'>
          <span className='flex size-4.5 shrink-0 items-center justify-center rounded-full bg-green text-white'>
            <svg
              width='11'
              height='11'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='3'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M20 6L9 17l-5-5' />
            </svg>
          </span>
          <span className='truncate'>{sentDetail || text.sentMessage}</span>
        </span>
        {resettable && (
          <button
            type='button'
            onClick={reset}
            className='text-[12px] font-medium text-ink-3 transition-colors duration-150 hover:text-ink'
          >
            Start over
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      data-approval-card='beautiful-ui'
      data-approval-variant={variant}
      className={cn(
        'w-full',
        variant === 'composer' ? 'max-w-none' : 'max-w-80'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-card bg-surface shadow-card',
          variant === 'composer' &&
            'border border-line-strong/80 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.38),0_6px_18px_-12px_rgba(0,0,0,0.18)]'
        )}
        style={{
          animation: 'fade-up 380ms cubic-bezier(0.23,1,0.32,1) both',
        }}
      >
        {dismissible && (
          <button
            type='button'
            aria-label='Dismiss'
            disabled={submitting}
            onClick={() => void dismiss()}
            className='primitive-icon-button absolute right-2.5 top-2.5 z-10 text-ink-3 transition-colors duration-100 hover:bg-hover hover:text-ink'
          >
            <Icon
              size={14}
              strokeWidth={2.2}
              path={<path d='M18 6L6 18M6 6l12 12' />}
            />
          </button>
        )}

        <div className='primitive-card-pad'>
          <div
            className='overflow-hidden'
            style={{
              height: viewportHeight,
              transition: animate ? `height ${SLIDE}` : undefined,
            }}
            aria-live='polite'
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 26,
                transform: `translate3d(0, ${-trackY}px, 0)`,
                transition: animate ? `transform ${SLIDE}` : undefined,
                willChange: 'transform',
              }}
            >
              {questions.map((question, currentQuestionIndex) => {
                const active = currentQuestionIndex === questionIndex
                if (!ready && !active) return null
                const picked = answers[currentQuestionIndex] ?? []
                const questionStyle: CSSProperties = {
                  opacity: active ? 1 : 0,
                  transition: animate ? `opacity ${SLIDE}` : undefined,
                  pointerEvents: active ? undefined : 'none',
                }
                return (
                  <div
                    key={`${question.q}-${currentQuestionIndex}`}
                    ref={element => {
                      questionRefs.current[currentQuestionIndex] = element
                    }}
                    aria-hidden={active ? undefined : true}
                    style={questionStyle}
                  >
                    <div
                      className={cn(
                        'pr-7 font-medium text-ink',
                        variant === 'composer' ? 'text-[15px]' : 'text-[14px]'
                      )}
                    >
                      {question.q}
                    </div>
                    <GlideMenu
                      className='mt-2.5 flex flex-col gap-1'
                      highlightClassName='inset-x-0 rounded-control bg-hover'
                    >
                      {question.options.map((option, optionIndex) => {
                        const selectedOption = picked.includes(optionIndex)
                        return (
                          <button
                            key={option}
                            type='button'
                            data-menu-row
                            aria-pressed={selectedOption}
                            disabled={submitting}
                            tabIndex={active ? 0 : -1}
                            onClick={() => {
                              if (active) toggle(optionIndex)
                            }}
                            className={cn(
                              'relative z-10 flex items-center gap-2 rounded-control pr-2 text-left transition-colors duration-100',
                              variant === 'composer'
                                ? 'min-h-9 px-2 py-2'
                                : 'py-1 pl-1'
                            )}
                          >
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center transition-colors duration-200 ${
                                question.type === 'radio'
                                  ? 'rounded-full'
                                  : 'rounded-[5px]'
                              } ${
                                selectedOption
                                  ? 'bg-ink text-canvas'
                                  : 'text-transparent shadow-[inset_0_0_0_1.5px_var(--line-strong)]'
                              }`}
                            >
                              {question.type === 'radio' ? (
                                <span
                                  className='size-1.5 rounded-full bg-canvas transition-transform duration-200'
                                  style={{
                                    transform: selectedOption
                                      ? 'scale(1)'
                                      : 'scale(0)',
                                  }}
                                />
                              ) : (
                                <svg
                                  width='12'
                                  height='12'
                                  viewBox='0 0 24 24'
                                  fill='none'
                                  stroke='currentColor'
                                  strokeWidth='3'
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                >
                                  <path d='M20 6L9 17l-5-5' />
                                </svg>
                              )}
                            </span>
                            <span
                              className={`text-[13px] leading-none transition-colors duration-200 ${selectedOption ? 'text-ink' : 'text-ink-2'}`}
                            >
                              {option}
                            </span>
                          </button>
                        )
                      })}
                      <label
                        data-menu-row
                        className={cn(
                          'relative z-10 flex items-center gap-2 rounded-control pr-2 transition-colors duration-100',
                          variant === 'composer'
                            ? 'min-h-9 px-2 py-2'
                            : 'py-1 pl-1'
                        )}
                      >
                        <input
                          value={customAnswers[currentQuestionIndex] ?? ''}
                          disabled={submitting}
                          tabIndex={active ? 0 : -1}
                          onChange={event => {
                            if (!active) return
                            setCustomAnswers(current => ({
                              ...current,
                              [currentQuestionIndex]: event.target.value,
                            }))
                            if (question.type === 'radio') {
                              setAnswers(current => ({
                                ...current,
                                [currentQuestionIndex]: [],
                              }))
                            }
                          }}
                          onKeyDown={event => {
                            if (event.key === 'Enter' && hasAnswer) {
                              event.preventDefault()
                              advance()
                            }
                          }}
                          placeholder={text.customPlaceholder}
                          aria-label='Custom answer'
                          className='min-w-0 flex-1 bg-transparent pl-1.5 text-[13px] text-ink outline-none placeholder:text-ink-3'
                        />
                      </label>
                    </GlideMenu>
                  </div>
                )
              })}
            </div>
          </div>
          {submitError && (
            <p role='alert' className='mt-2 text-[11px] text-destructive'>
              {submitError}
            </p>
          )}
        </div>

        <div className='primitive-card-footer flex items-center justify-between gap-3'>
          <div className='flex items-center gap-1 text-ink-3'>
            <button
              type='button'
              aria-label='Previous question'
              disabled={questionIndex <= 0 || submitting}
              onClick={() => goTo(questionIndex - 1)}
              className='flex size-[18px] items-center justify-center rounded-[5px] transition-colors duration-100 enabled:hover:text-ink disabled:opacity-30'
            >
              <Icon size={14} path={<path d='M18 15l-6-6-6 6' />} />
            </button>
            <span
              className='inline-flex items-center text-[12px] font-medium tabular-nums text-ink-3'
              style={{ letterSpacing: '-0.1px', lineHeight: 1 }}
            >
              <RollingDigits
                value={`${questionIndex + 1} / ${questions.length}`}
              />
            </span>
            <button
              type='button'
              aria-label='Next question'
              disabled={last || submitting}
              onClick={() => goTo(questionIndex + 1)}
              className='flex size-[18px] items-center justify-center rounded-[5px] transition-colors duration-100 enabled:hover:text-ink disabled:opacity-30'
            >
              <Icon size={14} path={<path d='M6 9l6 6 6-6' />} />
            </button>
          </div>

          <div className='-mr-0.5 flex items-center gap-1.5'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              radius='full'
              disabled={submitting}
              onClick={() => void skip()}
              className='h-auto px-3 py-[7px] text-[13px] leading-none'
            >
              {text.skip}
            </Button>
            <Button
              type='button'
              size='sm'
              radius='full'
              disabled={!hasAnswer || submitting}
              onClick={advance}
              className='h-auto px-3 py-[7px] text-[13px] leading-none'
            >
              {last ? text.send : text.continue}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
