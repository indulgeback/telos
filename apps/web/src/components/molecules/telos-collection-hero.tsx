'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TelosCollectionHeroProps {
  title: string
  subtitle: string
  ctaLabel: string
  imageSrc: string
  imagePosition?: string
  onAction?: () => void
}

export function TelosCollectionHero({
  title,
  subtitle,
  ctaLabel,
  imageSrc,
  imagePosition = 'object-[72%_center]',
  onAction,
}: TelosCollectionHeroProps) {
  return (
    <section className='group relative isolate min-h-[23rem] overflow-hidden rounded-[2rem] border border-[#18243b]/12 bg-[#bfead5] md:min-h-[20rem] xl:aspect-[3.2/1] xl:min-h-0'>
      <Image
        src={imageSrc}
        alt=''
        fill
        priority
        sizes='(max-width: 768px) 100vw, 80vw'
        className={cn(
          '-z-20 object-cover transition-transform duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:group-hover:scale-[1.012]',
          imagePosition
        )}
      />

      <div
        aria-hidden='true'
        className='absolute inset-y-0 left-0 -z-10 w-[88%] bg-background/92 [clip-path:polygon(0_0,80%_0,100%_100%,0_100%)] sm:w-[74%] md:w-[68%] lg:w-[62%]'
      />
      <div
        aria-hidden='true'
        className='absolute bottom-0 left-0 h-1.5 w-28 bg-[#ffd8c8] transition-[width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:w-44 motion-reduce:transition-none'
      />

      <div className='flex min-h-[23rem] items-end px-6 pb-8 pt-16 md:min-h-[20rem] md:px-9 md:pb-10 xl:absolute xl:inset-0 xl:min-h-0'>
        <div className='w-[72%] max-w-lg sm:w-auto'>
          <div aria-hidden='true' className='mb-6 flex items-center gap-2'>
            <span className='size-2 rounded-full bg-[#18243b]' />
            <span className='h-px w-12 bg-[#18243b]/28' />
            <span className='size-2 rounded-full bg-[#ffd8c8]' />
          </div>

          <h1 className='text-balance font-display text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.04em] text-foreground md:text-[2.5rem]'>
            {title}
          </h1>
          <p className='mt-4 max-w-md text-pretty text-sm leading-6 text-muted-foreground md:text-base md:leading-7'>
            {subtitle}
          </p>

          <button
            type='button'
            onClick={onAction}
            className='mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#18243b] px-5 py-2.5 text-sm font-medium text-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none'
          >
            {ctaLabel}
            <ArrowRight className='size-4' />
          </button>
        </div>
      </div>
    </section>
  )
}
