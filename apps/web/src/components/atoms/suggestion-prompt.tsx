import { cn } from '@/lib/utils'

export interface SuggestionPrompt {
  icon: string
  label: string
  prompt: string
}

interface SuggestionPromptButtonProps {
  suggestion: SuggestionPrompt
  onClick: (prompt: string) => void
  className?: string
  style?: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function SuggestionPromptButton({
  suggestion,
  onClick,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
}: SuggestionPromptButtonProps) {
  return (
    <button
      onClick={() => onClick(suggestion.prompt)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className={cn(
        'group relative flex min-h-[170px] w-[260px] flex-col justify-between rounded-2xl bg-card/90 p-5 text-left shadow-sm backdrop-blur',
        'transition-all duration-200 hover:-translate-y-1 hover:shadow-md',
        'active:scale-[0.98]',
        className
      )}
    >
      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
        <span className='text-lg'>{suggestion.icon}</span>
        <span className='font-medium'>{suggestion.label}</span>
      </div>
      <p className='mt-4 text-sm leading-relaxed text-foreground/90 line-clamp-3'>
        {suggestion.prompt}
      </p>
    </button>
  )
}
