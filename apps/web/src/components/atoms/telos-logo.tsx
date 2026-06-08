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
      viewBox='0 0 64 64'
      role='img'
      aria-label={title}
      className={cn('size-8 text-foreground', className)}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='20' cy='32' r='5.5' fill='currentColor' />
      <path
        d='M29 18H43.5L57 32L43.5 46H29L33.7 39H40.5L47.25 32L40.5 25H33.7L29 18Z'
        fill='currentColor'
      />
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
      <TelosMark className='size-8 shrink-0' title={title} />
      {showWordmark && (
        <span className='font-semibold text-xl leading-none text-foreground'>
          Telos
        </span>
      )}
    </span>
  )
}
