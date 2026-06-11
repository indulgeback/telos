'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atoms'
import { CustomLink } from '@/components/molecules'
import { authClient } from '@/lib/auth-client'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const ease = 'power3.out'

function ArrowGlyph() {
  return (
    <span
      aria-hidden='true'
      className='ml-3 inline-flex size-8 items-center justify-center rounded-full bg-primary-foreground/10 text-sm transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:scale-105'
    >
      ↗
    </span>
  )
}

function ProductVideo() {
  return (
    <div className='landing-object relative mx-auto w-full max-w-[680px]'>
      <div className='rounded-lg border border-background/45 bg-background/20 p-1.5 shadow-[0_34px_120px_hsl(var(--foreground)/0.16)]'>
        <div className='overflow-hidden rounded-md border border-background/30 bg-foreground'>
          <video
            autoPlay
            loop
            muted
            playsInline
            preload='metadata'
            poster='/landing/telos-promo-poster.jpg'
            aria-label='Telos product promotional video'
            className='aspect-video w-full object-cover'
          >
            <source src='/landing/telos-promo.mp4' type='video/mp4' />
          </video>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const root = useRef<HTMLElement>(null)
  const { data: session } = authClient.useSession()
  const t = useTranslations('HomePage')

  useGSAP(
    () => {
      gsap.from('.landing-hero-copy > *', {
        autoAlpha: 0,
        y: 34,
        duration: 1,
        stagger: 0.08,
        ease,
      })

      gsap.from('.landing-object', {
        autoAlpha: 0,
        y: 46,
        rotateX: 3,
        scale: 0.985,
        duration: 1.15,
        delay: 0.18,
        ease,
      })

      gsap.to('.landing-hero-image', {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: '.landing-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8,
        },
      })

      ScrollTrigger.batch('.landing-reveal', {
        start: 'top 82%',
        once: true,
        onEnter: elements => {
          gsap.from(elements, {
            autoAlpha: 0,
            y: 28,
            duration: 0.9,
            stagger: 0.07,
            ease,
            overwrite: true,
          })
        },
      })
    },
    { scope: root }
  )

  const capabilities = [
    [
      t('landing.capabilities.agentStudio.title'),
      t('landing.capabilities.agentStudio.description'),
    ],
    [
      t('landing.capabilities.toolRegistry.title'),
      t('landing.capabilities.toolRegistry.description'),
    ],
    [
      t('landing.capabilities.workflowRuns.title'),
      t('landing.capabilities.workflowRuns.description'),
    ],
    [
      t('landing.capabilities.scopedMemory.title'),
      t('landing.capabilities.scopedMemory.description'),
    ],
    [
      t('landing.capabilities.teamControl.title'),
      t('landing.capabilities.teamControl.description'),
    ],
  ]

  const stats = [
    [t('landing.stats.create.value'), t('landing.stats.create.label')],
    [t('landing.stats.connect.value'), t('landing.stats.connect.label')],
    [t('landing.stats.run.value'), t('landing.stats.run.label')],
    [t('landing.stats.govern.value'), t('landing.stats.govern.label')],
  ]

  const governanceLayers = [
    t('landing.governance.layers.identity'),
    t('landing.governance.layers.tools'),
    t('landing.governance.layers.memory'),
  ]

  return (
    <main ref={root} className='relative isolate bg-background text-foreground'>
      <div
        aria-hidden='true'
        className='pointer-events-none fixed inset-0 z-10 opacity-[0.025] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:40px_40px]'
      />

      <section className='landing-hero relative min-h-[92dvh] overflow-hidden border-b border-border'>
        <Image
          priority
          fill
          src='/landing/telos-studio-hero.png'
          alt=''
          sizes='100vw'
          className='landing-hero-image object-cover'
        />
        <div className='absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background)/0.58),hsl(var(--background)/0.2)_46%,hsl(var(--foreground)/0.12))]' />
        <div className='absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent' />

        <div className='relative mx-auto grid min-h-[92dvh] max-w-7xl items-end gap-12 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-24'>
          <div className='landing-hero-copy max-w-3xl self-center'>
            <h1 className='text-balance font-display text-[clamp(4.2rem,10vw,10.5rem)] font-semibold leading-[0.82] tracking-[-0.08em]'>
              Telos
            </h1>
            <p className='mt-8 max-w-xl text-pretty text-xl leading-8 text-foreground/78 sm:text-2xl sm:leading-9'>
              {t('landing.hero.subtitle')}
            </p>
            <p className='mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground'>
              {t('landing.hero.description')}
            </p>

            <div className='mt-10 flex flex-col gap-3 sm:flex-row'>
              <CustomLink href={session ? '/chat' : '/auth/signin'}>
                <Button className='group h-12 rounded-full px-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]'>
                  {session ? t('dashboard') : t('cta.getStarted')}
                  <ArrowGlyph />
                </Button>
              </CustomLink>
              <CustomLink
                href='https://github.com/indulgeback/telos'
                target='_blank'
              >
                <Button
                  variant='outline'
                  className='h-12 rounded-full border-foreground/15 bg-background/45 px-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]'
                >
                  {t('github')}
                </Button>
              </CustomLink>
            </div>
          </div>

          <ProductVideo />
        </div>
      </section>

      <section className='border-b border-border bg-background'>
        <div className='mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8'>
          {stats.map(([value, label]) => (
            <div
              key={label}
              className='landing-reveal border-border py-8 md:border-r md:last:border-r-0'
            >
              <p className='font-mono text-3xl tracking-[-0.04em] sm:text-4xl'>
                {value}
              </p>
              <p className='mt-2 text-sm text-muted-foreground'>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='mx-auto grid max-w-7xl gap-10 px-4 py-28 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-36'>
        <div className='landing-reveal'>
          <p className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
            {t('landing.capabilities.eyebrow')}
          </p>
          <h2 className='mt-5 max-w-2xl text-balance font-display text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-6xl'>
            {t('landing.capabilities.title')}
          </h2>
        </div>

        <div className='landing-reveal rounded-lg border border-border bg-muted/25 p-1.5'>
          <div className='grid overflow-hidden rounded-md border border-border bg-card md:grid-cols-2'>
            <div className='relative min-h-[420px] border-b border-border md:border-b-0 md:border-r'>
              <Image
                fill
                src='/landing/telos-studio-detail.png'
                alt=''
                sizes='(min-width: 1024px) 45vw, 100vw'
                className='object-cover'
              />
              <div className='absolute inset-0 bg-foreground/15' />
            </div>
            <div className='divide-y divide-border'>
              {capabilities.map(([label, description], index) => (
                <article key={label} className='p-6 sm:p-7'>
                  <span className='font-mono text-[11px] text-muted-foreground'>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className='mt-5 text-xl font-semibold tracking-[-0.03em]'>
                    {label}
                  </h3>
                  <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className='px-4 pb-28 sm:px-6 lg:px-8 lg:pb-36'>
        <div className='landing-reveal mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.15fr]'>
          <div className='self-end'>
            <p className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
              {t('landing.governance.eyebrow')}
            </p>
            <h2 className='mt-5 max-w-xl text-balance font-display text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl'>
              {t('landing.governance.title')}
            </h2>
            <p className='mt-5 max-w-lg text-base leading-7 text-muted-foreground'>
              {t('landing.governance.description')}
            </p>
          </div>

          <div className='rounded-lg border border-border bg-muted/25 p-1.5'>
            <div className='relative min-h-[560px] overflow-hidden rounded-md border border-border bg-foreground text-background'>
              <Image
                fill
                loading='eager'
                src='/landing/telos-architecture-gallery.png'
                alt=''
                sizes='(min-width: 1024px) 56vw, 100vw'
                className='object-cover opacity-80'
              />
              <div className='absolute inset-0 bg-[linear-gradient(180deg,transparent,hsl(var(--foreground)/0.62))]' />
              <div className='absolute inset-x-0 bottom-0 grid gap-px bg-background/12 sm:grid-cols-3'>
                {governanceLayers.map(layer => (
                  <div key={layer} className='bg-foreground/82 p-5'>
                    <p className='font-mono text-[11px] text-background/55'>
                      {layer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='px-4 pb-28 sm:px-6 lg:px-8'>
        <div className='landing-reveal mx-auto max-w-7xl border-y border-border py-16 sm:py-20'>
          <div className='grid items-end gap-10 lg:grid-cols-[1fr_auto]'>
            <div>
              <p className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                {t('landing.cta.eyebrow')}
              </p>
              <h2 className='mt-5 max-w-3xl text-balance font-display text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-6xl'>
                {t('landing.cta.title')}
              </h2>
              <p className='mt-5 max-w-xl text-base leading-7 text-muted-foreground'>
                {t('landing.cta.description')}
              </p>
            </div>
            <CustomLink href={session ? '/chat' : '/auth/signin'}>
              <Button className='group h-12 rounded-full px-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]'>
                {session ? t('dashboard') : t('cta.getStarted')}
                <ArrowGlyph />
              </Button>
            </CustomLink>
          </div>
        </div>
      </section>
    </main>
  )
}
