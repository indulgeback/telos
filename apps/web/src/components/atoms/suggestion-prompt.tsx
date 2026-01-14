import { cn } from '@/lib/utils'

export interface SuggestionPrompt {
  icon: string
  label: string
  prompt: string
}

interface SuggestionPromptButtonProps {
  suggestion: SuggestionPrompt
  onClick: (prompt: string) => void
}

export function SuggestionPromptButton({
  suggestion,
  onClick,
}: SuggestionPromptButtonProps) {
  return (
    <button
      onClick={() => onClick(suggestion.prompt)}
      className={cn(
        'group flex flex-col items-center rounded-xl border p-4 text-center',
        'transition-all hover:border-primary/50 hover:bg-primary/5',
        'active:scale-95'
      )}
    >
      <span className='mb-2 text-2xl group-hover:scale-110 transition-transform'>
        {suggestion.icon}
      </span>
      <span className='text-sm font-medium'>{suggestion.label}</span>
    </button>
  )
}
