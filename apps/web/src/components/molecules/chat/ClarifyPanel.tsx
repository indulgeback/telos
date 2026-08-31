'use client'

import ApprovalCard from '@/components/primitives/ApprovalCard'

export interface ClarifyPanelProps {
  messageId: string
  question: string
  options: string[]
  status: 'pending' | 'answered'
  selectedOption?: string | null
  onSelect?: (option: string) => void | Promise<void>
  placement?: 'message' | 'composer'
}

export function ClarifyPanel({
  messageId,
  question,
  options,
  status,
  selectedOption,
  onSelect,
  placement = 'composer',
}: ClarifyPanelProps) {
  return (
    <div
      className={
        placement === 'composer'
          ? 'beautiful-ui w-full animate-in fade-in slide-in-from-bottom-2 duration-300'
          : 'beautiful-ui my-5 flex w-full justify-center py-2'
      }
      data-clarify-message-id={messageId}
      data-clarify-placement={placement}
    >
      <ApprovalCard
        key={`${messageId}-${status}-${selectedOption ?? ''}`}
        questions={[{ q: question, type: 'radio', options }]}
        initialSent={status === 'answered'}
        sentDetail={selectedOption}
        resettable={false}
        dismissible={status === 'pending'}
        variant={placement === 'composer' ? 'composer' : 'compact'}
        autoSubmitRadio={placement !== 'composer'}
        hideAfterSubmit={placement === 'composer'}
        onSubmitted={async (answers, customAnswers) => {
          const selectedIndex = answers[0]?.[0]
          const answer =
            customAnswers[0]?.trim() ||
            (selectedIndex === undefined ? '' : options[selectedIndex])
          if (!answer) return
          await onSelect?.(answer)
        }}
        onSkipped={() => onSelect?.('Skip this question')}
        onDismissed={() => onSelect?.('Skip this question')}
      />
    </div>
  )
}
