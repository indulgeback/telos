import Image from 'next/image'

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
    <Image
      src='/brand/telos-ip.png'
      alt={title}
      width={64}
      height={64}
      className={cn('size-8 rounded-[0.65rem] object-cover', className)}
    />
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
        <span className='font-semibold text-xl leading-none text-foreground relative top-[1px]'>
          Telos
        </span>
      )}
    </span>
  )
}
