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

const creationModes = ['Learning', 'Writing', 'Image', 'Slides', 'Video', 'Web']

const promptChips = [
  'Research',
  'Operations',
  'Support',
  'Launch',
  'Sales',
  'Engineering',
]

const storyBlocks = [
  {
    kicker: 'Capture the spark',
    title: 'Start from a note, file, link, or passing thought.',
    body: 'A request rarely arrives clean. Telos keeps the materials, goal, owner, memory, and permissions together until the agent is ready to act.',
    image: '/landing/telos-t/capture.png',
  },
  {
    kicker: 'Deepen the work',
    title: 'Let context, tools, and memory talk to each other.',
    body: 'Agents can inspect prior runs, ask for missing context, call approved tools, and turn scattered information into a usable plan.',
    image: '/landing/telos-t/context.png',
  },
  {
    kicker: 'Make it real',
    title: 'Move from a conversation to a finished workflow.',
    body: 'The output is only the beginning. Your team can refine it, rerun it, audit it, and share the same operating pattern again.',
    image: '/landing/telos-t/complete.png',
  },
]

const galleryImages = [
  '/landing/telos-t/complete.png',
  '/landing/telos-t/context.png',
  '/landing/telos-t/capture.png',
]

const workSamples = [
  ['Luxury travel proposal', 'Slides'],
  ['Minimal agency website', 'Web'],
  ['Campaign video brief', 'Video'],
  ['Product photo board', 'Image'],
  ['Architect portfolio', 'Slides'],
  ['Customer research map', 'Workflow'],
  ['Launch desk assistant', 'Agent'],
  ['Weekly insight digest', 'Writing'],
]

const testimonials = [
  {
    role: 'Founder',
    name: 'Maya Chen',
    quote:
      'I start with a messy idea and Telos turns it into a working board, an agent, and a run I can actually hand to the team.',
  },
  {
    role: 'YouTube creator',
    name: 'Julian Park',
    quote:
      'Topic research, scripts, sponsor notes, and thumbnails used to live in different tabs. Now one agent keeps the whole project moving.',
  },
  {
    role: 'Product manager',
    name: 'Priya Shah',
    quote:
      'Meeting notes, feedback, and market signals stop feeling buried. Telos helps surface what matters and remembers the decisions behind it.',
  },
]

const milestones = [
  ['50K+', 'agent runs created'],
  ['1M+', 'tasks and artifacts shipped'],
  ['120+', 'workspaces connected'],
  ['10K+', 'reusable skills built'],
]

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

function PromptComposer({ signedIn }: { signedIn: boolean }) {
  return (
    <div className='landing-object mx-auto w-full max-w-4xl'>
      <div className='rounded-[2rem] bg-foreground/[0.045] p-2 ring-1 ring-foreground/10 shadow-[0_44px_140px_hsl(var(--foreground)/0.12)]'>
        <div className='overflow-hidden rounded-[calc(2rem-0.5rem)] bg-card shadow-[inset_0_1px_1px_hsl(var(--background)/0.95)]'>
          <div className='flex min-h-32 flex-col gap-5 px-5 py-5 sm:px-7'>
            <h2 className='text-center font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl'>
              Ready to start building?
            </h2>
            <div className='flex flex-wrap gap-2'>
              {creationModes.map(mode => (
                <span
                  key={mode}
                  className='rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/5'
                >
                  {mode}
                </span>
              ))}
            </div>

            <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-end'>
              <div
                role='textbox'
                aria-label='Example agent request'
                className='min-h-28 text-xl leading-8 text-foreground sm:text-2xl sm:leading-9'
              >
                Let Telos create an agent that turns scattered research into a
                launch brief, task list, and reusable workflow.
              </div>

              <CustomLink href={signedIn ? '/chat' : '/auth/signin'}>
                <Button className='group h-12 rounded-full px-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]'>
                  Start
                  <ArrowGlyph />
                </Button>
              </CustomLink>
            </div>

            <div className='flex gap-2 overflow-x-auto pb-1'>
              {promptChips.map(chip => (
                <span
                  key={chip}
                  className='shrink-0 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground'
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className='grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-4'>
              <span>Chrome extension</span>
              <span>Android soon</span>
              <span>iOS app</span>
              <span>macOS beta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkGallery() {
  return (
    <div className='landing-reveal mx-auto max-w-7xl overflow-hidden border-y border-border py-12'>
      <div className='flex w-max animate-[gallery-drift_42s_linear_infinite] items-end gap-4 motion-reduce:animate-none'>
        {[...workSamples, ...workSamples].map(([title, type], index) => (
          <article
            key={`${title}-${index}`}
            className={`shrink-0 overflow-hidden rounded-[1.5rem] bg-card p-2 ring-1 ring-foreground/8 ${
              index % 3 === 0 ? 'w-80' : index % 3 === 1 ? 'w-64' : 'w-72'
            }`}
          >
            <div
              className={`relative overflow-hidden rounded-[1rem] bg-[#bfead5] ${
                index % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[4/3]'
              }`}
            >
              <Image
                fill
                src={galleryImages[index % galleryImages.length]}
                alt=''
                sizes='320px'
                className='object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.025]'
              />
            </div>
            <div className='flex items-center justify-between gap-4 px-2 py-4'>
              <h3 className='text-sm font-semibold tracking-[-0.02em]'>
                {title}
              </h3>
              <span className='shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground'>
                {type}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function LandingPage() {
  const root = useRef<HTMLElement>(null)
  const { data: session } = authClient.useSession()
  const t = useTranslations('HomePage')
  const signedIn = Boolean(session)

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.landing-hero-copy > *', {
          autoAlpha: 0,
          y: 36,
          duration: 1,
          stagger: 0.08,
          ease,
        })

        gsap.from('.landing-object', {
          autoAlpha: 0,
          y: 40,
          scale: 0.985,
          duration: 1.1,
          delay: 0.16,
          ease,
        })

        gsap.to('.t-hero-art', {
          yPercent: 5,
          ease: 'none',
          scrollTrigger: {
            trigger: '#overview',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
          },
        })

        gsap.to('.t-hero-orbit', {
          xPercent: 14,
          yPercent: -12,
          rotate: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: '#overview',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.9,
          },
        })

        ScrollTrigger.batch('.landing-reveal', {
          start: 'top 82%',
          once: true,
          onEnter: elements => {
            gsap.from(elements, {
              autoAlpha: 0,
              y: 30,
              duration: 0.95,
              stagger: 0.08,
              ease,
              overwrite: true,
            })
          },
        })
      })

      return () => media.revert()
    },
    { scope: root }
  )

  return (
    <main
      ref={root}
      className='relative isolate overflow-hidden bg-background text-foreground'
    >
      <div
        aria-hidden='true'
        className='pointer-events-none fixed inset-0 z-10 opacity-[0.025] mix-blend-multiply'
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 180 180%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.9%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%27.8%27/%3E%3C/svg%3E")',
        }}
      />

      <section
        id='overview'
        className='relative min-h-[100dvh] px-4 pb-16 pt-28 sm:px-6 lg:px-8'
      >
        <div className='absolute -right-28 top-24 -z-10 size-[30rem] rounded-full bg-[#bfead5]/45' />
        <div className='mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16'>
          <div className='landing-hero-copy text-left'>
            <p className='inline-flex rounded-full border border-[#18243b]/12 bg-[#bfead5]/45 px-4 py-2 text-xs font-medium text-[#18243b]'>
              Telos agent creation studio
            </p>
            <h1 className='mt-9 max-w-4xl text-balance font-display text-[clamp(4.75rem,10vw,10rem)] font-bold leading-[0.84] tracking-[-0.055em]'>
              Build boldly.
            </h1>
            <p className='mt-8 max-w-xl text-pretty text-xl leading-8 text-foreground/72 sm:text-2xl sm:leading-9'>
              If you can imagine the work, Telos can help you shape the agent,
              tools, memory, and workflow to make it happen.
            </p>
          </div>

          <div className='landing-object relative min-h-[30rem] lg:min-h-[40rem]'>
            <div className='t-hero-orbit absolute -left-8 top-10 size-36 rounded-full border-[22px] border-[#ffd8c8]/80 sm:size-44' />
            <div className='absolute -right-5 bottom-6 size-28 rounded-full bg-[#18243b] sm:size-36' />
            <div className='t-hero-art absolute inset-0 overflow-hidden rounded-[2.75rem] border border-[#18243b]/12 bg-[#bfead5] shadow-[0_36px_100px_hsl(var(--foreground)/0.14)]'>
              <Image
                priority
                fill
                src='/landing/telos-t/hero.png'
                alt='T, the Telos mascot, guiding connected agent tasks'
                sizes='(min-width: 1024px) 58vw, 100vw'
                className='object-cover object-[70%_center] lg:object-center'
              />
            </div>
            <div className='absolute -bottom-5 left-6 right-12 h-10 rounded-full bg-[#18243b]/12 blur-xl' />
          </div>
        </div>

        <div className='mt-14'>
          <PromptComposer signedIn={signedIn} />
        </div>

        <div className='landing-reveal mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground'>
          <span>Browser tools</span>
          <span className='size-1 rounded-full bg-muted-foreground/35' />
          <span>Scoped memory</span>
          <span className='size-1 rounded-full bg-muted-foreground/35' />
          <span>Workflow runs</span>
          <span className='size-1 rounded-full bg-muted-foreground/35' />
          <span>Team governance</span>
        </div>
      </section>

      <section id='use-cases' className='px-4 py-24 sm:px-6 lg:px-8 lg:py-32'>
        <div className='landing-reveal mx-auto mb-20 max-w-5xl text-center'>
          <p className='text-sm text-muted-foreground'>
            Watch how persistent agent work changes what a team can create.
          </p>
          <h2 className='mt-8 text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
            Every idea deserves to become a finished system, and Telos makes
            that possible.
          </h2>
        </div>

        <div className='mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16'>
          <div className='landing-reveal lg:sticky lg:top-28 lg:self-start'>
            <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
              {t('landing.capabilities.eyebrow')}
            </p>
            <h2 className='mt-6 max-w-2xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
              From a spark to an agent that can keep going.
            </h2>
            <div className='relative mt-10 aspect-square max-w-sm overflow-hidden rounded-[2.5rem] border border-[#18243b]/10 bg-[#bfead5]'>
              <Image
                fill
                src='/brand/telos-ip.png'
                alt='T, the Telos terminal-native assistant'
                sizes='384px'
                className='object-cover'
              />
            </div>
          </div>

          <div className='grid gap-8'>
            {storyBlocks.map((item, index) => (
              <article
                key={item.title}
                className='landing-reveal overflow-hidden rounded-[2.25rem] border border-[#18243b]/10 bg-card shadow-[0_24px_70px_hsl(var(--foreground)/0.07)]'
              >
                <div className='grid min-h-[31rem] md:grid-cols-[0.8fr_1.2fr]'>
                  <div className='flex flex-col p-7 sm:p-9'>
                    <span className='font-mono text-5xl tracking-[-0.08em] text-[#18243b]/24'>
                      0{index + 1}
                    </span>
                    <p className='mt-8 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
                      {item.kicker}
                    </p>
                    <h3 className='mt-5 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl'>
                      {item.title}
                    </h3>
                    <p className='mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 md:mt-auto'>
                      {item.body}
                    </p>
                  </div>
                  <div className='relative min-h-72 overflow-hidden bg-[#bfead5]'>
                    <Image
                      fill
                      src={item.image}
                      alt={`${item.kicker} with T`}
                      sizes='(min-width: 1024px) 36vw, 100vw'
                      className='object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02]'
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='prompts' className='px-4 py-24 sm:px-6 lg:px-8 lg:py-32'>
        <div className='landing-reveal mx-auto max-w-7xl text-center'>
          <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
            Create with Telos
          </p>
          <h2 className='mx-auto mt-6 max-w-5xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
            Real work from real agent studios.
          </h2>
        </div>
        <div className='mt-12'>
          <WorkGallery />
        </div>
      </section>

      <section id='blog' className='px-4 py-24 sm:px-6 lg:px-8 lg:py-32'>
        <div className='mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]'>
          <div className='landing-reveal self-end'>
            <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
              Community
            </p>
            <h2 className='mt-6 max-w-3xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
              Builders are already turning messy ideas into repeatable work.
            </h2>
          </div>
          <div className='grid gap-4'>
            {testimonials.map(item => (
              <article
                key={item.name}
                className='landing-reveal rounded-[1.75rem] bg-card p-7 ring-1 ring-foreground/8'
              >
                <p className='text-lg leading-8 text-foreground/82'>
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className='mt-6 flex items-center justify-between gap-4 border-t border-border pt-4'>
                  <p className='font-semibold tracking-[-0.02em]'>
                    {item.name}
                  </p>
                  <p className='text-sm text-muted-foreground'>{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='updates' className='px-4 pb-28 sm:px-6 lg:px-8 lg:pb-36'>
        <div className='landing-reveal mx-auto max-w-7xl border-y border-border py-16 sm:py-20'>
          <div className='grid gap-8 md:grid-cols-4'>
            {milestones.map(([value, label]) => (
              <div key={label}>
                <p className='font-mono text-5xl tracking-[-0.06em] sm:text-6xl'>
                  {value}
                </p>
                <p className='mt-3 text-sm text-muted-foreground'>{label}</p>
              </div>
            ))}
          </div>

          <div className='mt-16 grid items-end gap-10 lg:grid-cols-[1fr_auto]'>
            <div>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                {t('landing.cta.eyebrow')}
              </p>
              <h2 className='mt-5 max-w-4xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
                Build boldly.
              </h2>
              <p className='mt-6 max-w-2xl text-base leading-7 text-muted-foreground'>
                Telos gives every agent a place to gather context, use tools,
                create outputs, and leave a trace your team can trust.
              </p>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <CustomLink href={signedIn ? '/chat' : '/auth/signin'}>
                <Button className='group h-12 rounded-full px-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]'>
                  {signedIn ? t('dashboard') : t('cta.getStarted')}
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
        </div>
      </section>
    </main>
  )
}
