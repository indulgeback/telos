'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentHeroBannerProps {
  onCreate?: () => void
}

export function AgentHeroBanner({ onCreate }: AgentHeroBannerProps) {
  const t = useTranslations('Agent')

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] border border-border/60',
        'aspect-[2048/640]'
      )}
    >
      <Image
        src='/agents-hero-bg.jpg'
        alt=''
        fill
        priority
        sizes='(max-width: 768px) 100vw, 80vw'
        className='-z-20 object-cover'
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10',
          'bg-gradient-to-r from-background via-background/85 to-transparent',
          'md:from-background md:via-background/70 md:to-transparent'
        )}
      />

      <div className='absolute inset-0 flex items-end pb-8 md:pb-12'>
        <div className='max-w-xl px-6 md:px-8'>
          <h1
            className={cn(
              'text-balance text-3xl font-medium leading-[1.15] tracking-tight md:text-[40px]',
              'font-display'
            )}
          >
            {t('hero.title')}
          </h1>

          <p className='mt-4 max-w-md text-pretty text-sm text-muted-foreground md:text-base'>
            {t('hero.subtitle')}
          </p>

          <div className='mt-7 flex flex-wrap items-center gap-3'>
            <button
              type='button'
              onClick={onCreate}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5',
                'text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
              )}
            >
              {t('hero.cta')}
              <ArrowRight className='size-4' />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
