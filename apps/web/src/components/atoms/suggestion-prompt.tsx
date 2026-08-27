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
        'group relative flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left',
        'transition-all duration-200 hover:border-primary/35 hover:bg-accent/55',
        'active:scale-[0.98]',
        className
      )}
    >
      <span className='grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-base transition-colors group-hover:bg-card'>
        {suggestion.icon}
      </span>
      <div className='min-w-0 flex-1'>
        <span className='block font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground'>
          {suggestion.label}
        </span>
        <p className='mt-0.5 line-clamp-1 text-[13px] leading-relaxed text-foreground/85'>
          {suggestion.prompt}
        </p>
      </div>
      <span className='font-mono text-[11px] text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary'>
        ↗
      </span>
    </button>
  )
}
