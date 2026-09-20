import { cn } from '@/lib/utils'

interface TelosMarkProps {
  className?: string
  title?: string
}

interface TelosLogoProps extends TelosMarkProps {
  showWordmark?: boolean
}

export function TelosMark({ className, title = 'Telos' }: TelosMarkProps) {
  return (
    <svg
      viewBox='0 0 128 128'
      fill='none'
      role='img'
      aria-label={title}
      className={cn('size-8 shrink-0', className)}
    >
      <path
        fill='currentColor'
        d='M9 34 26 15Q31 9 41 9H119Q126 9 122 16L107 34Q101 42 91 42H12Q3 42 9 34Z'
      />
      <path
        fill='#708367'
        d='M30 78 37 61Q43 48 59 48H71Q62 54 57 66Q53 78 40 78Z'
      />
      <path fill='currentColor' d='M88 47V93Q88 117 59 117V76Q59 51 88 47Z' />
    </svg>
  )
}

export function TelosLogo({
  className,
  showWordmark = true,
  title = 'Telos',
}: TelosLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <TelosMark title={title} />
      {showWordmark && (
        <span
          className='text-[28px] leading-none tracking-[-0.055em] font-semibold'
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          aria-hidden='true'
        >
          Telos
        </span>
      )}
    </span>
  )
}
