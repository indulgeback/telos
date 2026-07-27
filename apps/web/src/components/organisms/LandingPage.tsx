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
    image: '/landing/generated/telos-ai-capture.png',
  },
  {
    kicker: 'Deepen the work',
    title: 'Let context, tools, and memory talk to each other.',
    body: 'Agents can inspect prior runs, ask for missing context, call approved tools, and turn scattered information into a usable plan.',
    image: '/landing/generated/telos-ai-workflow.png',
  },
  {
    kicker: 'Make it real',
    title: 'Move from a conversation to a finished workflow.',
    body: 'The output is only the beginning. Your team can refine it, rerun it, audit it, and share the same operating pattern again.',
    image: '/landing/generated/telos-ai-gallery.png',
  },
]

const galleryImages = [
  '/landing/generated/telos-ai-gallery.png',
  '/landing/generated/telos-ai-workflow.png',
  '/landing/generated/telos-ai-capture.png',
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
      <div className='flex w-max animate-[gallery-drift_42s_linear_infinite] gap-4'>
        {[...workSamples, ...workSamples].map(([title, type], index) => (
          <article
            key={`${title}-${index}`}
            className='w-72 shrink-0 rounded-[1.5rem] bg-card p-2 ring-1 ring-foreground/8'
          >
            <div className='relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted'>
              <Image
                fill
                src={galleryImages[index % galleryImages.length]}
                alt=''
                sizes='288px'
                className='object-cover opacity-85 grayscale-[0.18]'
              />
              <div className='absolute inset-0 bg-[linear-gradient(180deg,transparent,hsl(var(--foreground)/0.42))]' />
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
        delay: 0.22,
        ease,
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
        className='pointer-events-none fixed inset-0 z-10 opacity-[0.035] [background-image:radial-gradient(hsl(var(--foreground))_0.7px,transparent_0.7px)] [background-size:18px_18px]'
      />

      <section
        id='overview'
        className='relative min-h-[100dvh] px-4 pb-16 pt-28 sm:px-6 lg:px-8'
      >
        <div className='absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(circle_at_50%_0%,hsl(var(--foreground)/0.10),transparent_58%)]' />
        <div className='landing-hero-copy mx-auto flex max-w-7xl flex-col items-center text-center'>
          <div className='relative mb-10 aspect-[16/7] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-card p-2 ring-1 ring-foreground/10 shadow-[0_44px_140px_hsl(var(--foreground)/0.10)]'>
            <Image
              priority
              fill
              src='/landing/generated/telos-ai-hero-studio.png'
              alt='Abstract Telos agent studio interface'
              sizes='(min-width: 1024px) 896px, 100vw'
              className='object-cover p-2'
            />
          </div>
          <p className='rounded-full border border-border bg-card/70 px-4 py-2 text-xs font-medium text-muted-foreground shadow-[0_18px_70px_hsl(var(--foreground)/0.06)]'>
            Telos agent creation studio
          </p>
          <h1 className='mt-10 max-w-6xl text-balance font-display text-[clamp(4.5rem,12vw,13.5rem)] font-bold leading-[0.84] tracking-[-0.055em]'>
            Build boldly.
          </h1>
          <p className='mt-8 max-w-2xl text-pretty text-xl leading-8 text-foreground/72 sm:text-2xl sm:leading-9'>
            If you can imagine the work, Telos can help you shape the agent,
            tools, memory, and workflow to make it happen.
          </p>
        </div>

        <div className='mt-12'>
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

        <div className='mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr]'>
          <div className='landing-reveal'>
            <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
              {t('landing.capabilities.eyebrow')}
            </p>
            <h2 className='mt-6 max-w-2xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
              From a spark to an agent that can keep going.
            </h2>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {storyBlocks.map((item, index) => (
              <article
                key={item.title}
                className={`landing-reveal rounded-[2rem] bg-foreground/[0.045] p-2 ring-1 ring-foreground/10 ${
                  index === 0 ? 'md:col-span-2' : ''
                }`}
              >
                <div className='grid h-full overflow-hidden rounded-[calc(2rem-0.5rem)] bg-card md:grid-cols-[0.95fr_1.05fr]'>
                  <div className='p-7 sm:p-9'>
                    <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
                      {item.kicker}
                    </p>
                    <h3 className='mt-5 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl'>
                      {item.title}
                    </h3>
                    <p className='mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7'>
                      {item.body}
                    </p>
                  </div>
                  <div className='relative min-h-64 overflow-hidden bg-muted'>
                    <Image
                      fill
                      src={item.image}
                      alt=''
                      sizes='(min-width: 1024px) 36vw, 100vw'
                      className='object-cover opacity-90'
                    />
                    <div className='absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--card))_0%,transparent_42%)] md:block' />
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
