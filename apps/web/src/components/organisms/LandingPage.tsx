'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { ArrowUpRight, Paperclip, Play, Plus, Send } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atoms'
import { CustomLink } from '@/components/molecules'
import { authClient } from '@/lib/auth-client'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const modes = ['All', 'Research', 'Writing', 'Design', 'Operations', 'Code']

const galleryItems = [
  {
    title: 'Campaign research board',
    type: 'Research',
    image: '/landing/youmind-telos/hero-gallery.webp',
    position: 'center',
  },
  {
    title: 'Source library',
    type: 'Knowledge',
    image: '/landing/youmind-telos/capture.webp',
    position: '52% center',
  },
  {
    title: 'Context map',
    type: 'Workspace',
    image: '/landing/youmind-telos/context.webp',
    position: '42% center',
  },
  {
    title: 'Launch workflow',
    type: 'Operations',
    image: '/landing/youmind-telos/workflow.webp',
    position: 'center',
  },
  {
    title: 'Creative studio',
    type: 'Design',
    image: '/landing/youmind-telos/showcase.webp',
    position: 'center',
  },
  {
    title: 'Agent handoff',
    type: 'Workflow',
    image: '/landing/youmind-telos/workflow.webp',
    position: '78% center',
  },
  {
    title: 'Editorial direction',
    type: 'Writing',
    image: '/landing/youmind-telos/hero-gallery.webp',
    position: '64% center',
  },
  {
    title: 'Knowledge synthesis',
    type: 'Strategy',
    image: '/landing/youmind-telos/context.webp',
    position: '18% center',
  },
]

const featureStories = [
  {
    number: '01',
    eyebrow: 'Gather everything',
    title: 'Give every idea a place to begin.',
    body: 'Bring in notes, links, files, conversations, and rough requests. Telos keeps the source, goal, owner, and permissions together from the first spark.',
    image: '/landing/youmind-telos/capture.webp',
    position: '42% center',
  },
  {
    number: '02',
    eyebrow: 'Think with context',
    title: 'Turn scattered material into shared understanding.',
    body: 'Agents can inspect prior runs, connect decisions, ask for missing context, and carry the right memory into the next piece of work.',
    image: '/landing/youmind-telos/context.webp',
    position: '56% center',
  },
  {
    number: '03',
    eyebrow: 'Keep work moving',
    title: 'Build workflows your team can trust and repeat.',
    body: 'Combine agents, approved tools, and checkpoints into a run that leaves a clear trace — ready to refine, rerun, and hand to someone else.',
    image: '/landing/youmind-telos/workflow.webp',
    position: 'center',
  },
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

function PromptComposer({ signedIn }: { signedIn: boolean }) {
  return (
    <div className='ym-enter mx-auto w-full max-w-[940px]'>
      <div className='rounded-[28px] border border-black/[0.08] bg-white p-3 shadow-[0_24px_70px_rgba(23,33,58,0.09)] dark:bg-[#161616]'>
        <div className='flex min-h-40 flex-col px-3 pb-2 pt-3 sm:min-h-48 sm:px-5 sm:pt-5'>
          <p className='max-w-3xl text-lg leading-8 text-black/45 dark:text-white/45 sm:text-[22px]'>
            What do you want your agents to research, create, or keep moving?
          </p>
          <div className='mt-auto flex items-center justify-between gap-4 pt-8'>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                aria-label='Add context'
                className='flex size-9 items-center justify-center rounded-full bg-[#f1f0eb] text-black/65 transition-colors hover:bg-[#e8e6df] dark:bg-white/10 dark:text-white/65'
              >
                <Plus className='size-4' />
              </button>
              <button
                type='button'
                aria-label='Attach a file'
                className='flex size-9 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#f1f0eb] hover:text-black dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white'
              >
                <Paperclip className='size-4' />
              </button>
              <span className='hidden text-xs text-black/35 dark:text-white/35 sm:inline'>
                T can use files, links, skills, and memory
              </span>
            </div>
            <CustomLink href={signedIn ? '/chat' : '/auth/signin'}>
              <Button
                size='icon'
                aria-label='Start with Telos'
                className='size-10 rounded-full bg-[#17213a] text-white shadow-none hover:bg-[#27334f]'
              >
                <Send className='size-4' />
              </Button>
            </CustomLink>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${compact ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
    >
      {galleryItems.slice(0, compact ? 6 : 8).map(item => (
        <article key={`${compact}-${item.title}`} className='group min-w-0'>
          <div
            className={`relative overflow-hidden rounded-[14px] bg-[#ebe8df] ${compact ? 'aspect-[4/3]' : 'aspect-[1.38/1]'}`}
          >
            <Image
              fill
              src={item.image}
              alt={item.title}
              sizes={
                compact
                  ? '(min-width: 1024px) 31vw, 50vw'
                  : '(min-width: 1024px) 23vw, 50vw'
              }
              className='object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.025]'
              style={{ objectPosition: item.position }}
            />
          </div>
          {compact && (
            <div className='flex items-center justify-between gap-3 px-1 pb-2 pt-3'>
              <h3 className='truncate text-sm font-medium tracking-[-0.02em]'>
                {item.title}
              </h3>
              <span className='shrink-0 text-[11px] text-black/40 dark:text-white/40'>
                {item.type}
              </span>
            </div>
          )}
        </article>
      ))}
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
        gsap.from('.ym-hero > *', {
          autoAlpha: 0,
          y: 24,
          duration: 0.9,
          stagger: 0.07,
          ease: 'power3.out',
        })
        gsap.from('.ym-enter', {
          autoAlpha: 0,
          y: 22,
          scale: 0.99,
          duration: 0.9,
          delay: 0.18,
          ease: 'power3.out',
        })
        ScrollTrigger.batch('.ym-reveal', {
          start: 'top 88%',
          once: true,
          onEnter: elements =>
            gsap.from(elements, {
              autoAlpha: 0,
              y: 24,
              duration: 0.85,
              stagger: 0.06,
              ease: 'power3.out',
              overwrite: true,
            }),
        })
      })
      return () => media.revert()
    },
    { scope: root }
  )

  return (
    <main
      ref={root}
      className='relative overflow-hidden bg-[#fbfaf7] text-[#171717] dark:bg-background dark:text-foreground'
    >
      <section
        id='overview'
        className='px-4 pb-24 pt-40 sm:px-6 sm:pt-48 lg:px-8'
      >
        <div className='ym-hero mx-auto max-w-6xl text-center'>
          <p className='text-xs font-medium uppercase tracking-[0.2em] text-black/45 dark:text-white/45'>
            Telos agent creation studio
          </p>
          <h1 className='mx-auto mt-8 max-w-5xl text-balance font-display text-[clamp(4.25rem,8.7vw,8.5rem)] font-semibold leading-[0.86] tracking-[-0.055em]'>
            Create boldly.
          </h1>
          <p className='mx-auto mt-8 max-w-2xl text-pretty text-lg leading-8 text-black/55 dark:text-white/55 sm:text-xl'>
            Think with context. Build with capable agents. Turn a rough idea
            into work your team can use, trust, and repeat.
          </p>
        </div>

        <div className='mt-12'>
          <PromptComposer signedIn={signedIn} />
        </div>

        <div className='ym-reveal mx-auto mt-8 flex max-w-3xl items-center justify-start gap-2 overflow-x-auto pb-2 sm:justify-center'>
          {modes.map((mode, index) => (
            <span
              key={mode}
              className={`shrink-0 rounded-full px-4 py-2 text-xs ${
                index === 0
                  ? 'bg-[#17213a] text-white'
                  : 'bg-[#f0eee8] text-black/55 dark:bg-white/8 dark:text-white/55'
              }`}
            >
              {mode}
            </span>
          ))}
        </div>

        <div className='ym-reveal mx-auto mt-6 max-w-[1180px]'>
          <WorkGrid />
        </div>

        <div className='ym-reveal mx-auto mt-20 max-w-5xl border-y border-black/[0.08] py-7 dark:border-white/10'>
          <div className='grid grid-cols-2 gap-y-7 text-center sm:grid-cols-4'>
            {[
              'Browser tools',
              'Scoped memory',
              'Reusable skills',
              'Team governance',
            ].map((label, index) => (
              <div
                key={label}
                className='flex items-center justify-center gap-3'
              >
                <span className='font-mono text-[11px] text-black/30 dark:text-white/30'>
                  0{index + 1}
                </span>
                <span className='text-sm text-black/65 dark:text-white/65'>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id='use-cases' className='px-4 py-32 sm:px-6 lg:px-8 lg:py-52'>
        <div className='ym-reveal mx-auto max-w-5xl text-center'>
          <p className='text-sm text-black/45 dark:text-white/45'>
            An agent studio that does not lose the thread.
          </p>
          <h2 className='mx-auto mt-8 max-w-5xl text-balance font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[5.5rem]'>
            Your ideas, context, and tools — finally working as one.
          </h2>
        </div>

        <div className='mx-auto mt-24 grid max-w-[1240px] gap-12 lg:grid-cols-3 lg:gap-5'>
          {featureStories.map(story => (
            <article key={story.number} className='ym-reveal'>
              <div className='relative aspect-[4/5] overflow-hidden rounded-[18px] bg-[#ebe8df]'>
                <Image
                  fill
                  src={story.image}
                  alt={story.title}
                  sizes='(min-width: 1024px) 31vw, 100vw'
                  className='object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02]'
                  style={{ objectPosition: story.position }}
                />
              </div>
              <div className='pt-7'>
                <div className='flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-black/40 dark:text-white/40'>
                  <span className='font-mono'>{story.number}</span>
                  <span>{story.eyebrow}</span>
                </div>
                <h3 className='mt-5 text-3xl font-medium leading-[1.08] tracking-[-0.04em]'>
                  {story.title}
                </h3>
                <p className='mt-5 text-[15px] leading-7 text-black/52 dark:text-white/52'>
                  {story.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id='prompts' className='px-4 py-28 sm:px-6 lg:px-8 lg:py-44'>
        <div className='ym-reveal mx-auto max-w-5xl text-center'>
          <p className='text-sm text-black/45 dark:text-white/45'>Meet Telos</p>
          <h2 className='mx-auto mt-7 max-w-4xl text-balance font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
            A studio for work that keeps moving.
          </h2>
          <p className='mx-auto mt-6 max-w-2xl text-base leading-7 text-black/50 dark:text-white/50'>
            T helps connect the materials, decisions, tools, and people behind
            the work — so every run starts smarter than the last.
          </p>
        </div>

        <div className='ym-reveal group relative mx-auto mt-16 aspect-video max-w-[1180px] overflow-hidden rounded-[20px] bg-[#ebe8df]'>
          <Image
            fill
            src='/landing/youmind-telos/showcase.webp'
            alt='A gallery of work made with Telos'
            sizes='(min-width: 1280px) 1180px, 100vw'
            className='object-cover transition-transform duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.015]'
          />
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='flex size-16 items-center justify-center rounded-full bg-white/92 text-[#17213a] shadow-[0_14px_45px_rgba(23,33,58,0.18)] backdrop-blur sm:size-20'>
              <Play className='ml-1 size-5 fill-current sm:size-6' />
            </span>
          </div>
        </div>
      </section>

      <section className='px-4 py-28 sm:px-6 lg:px-8 lg:py-44'>
        <div className='ym-reveal mx-auto flex max-w-[1180px] items-end justify-between gap-8'>
          <div>
            <p className='text-sm text-black/45 dark:text-white/45'>
              Made with Telos
            </p>
            <h2 className='mt-6 max-w-3xl text-balance font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
              Work worth sharing.
            </h2>
          </div>
          <CustomLink href={signedIn ? '/chat' : '/auth/signin'}>
            <Button
              variant='ghost'
              className='hidden rounded-full text-sm sm:inline-flex'
            >
              Explore the studio
              <ArrowUpRight className='ml-2 size-4' />
            </Button>
          </CustomLink>
        </div>
        <div className='ym-reveal mx-auto mt-14 max-w-[1180px]'>
          <WorkGrid compact />
        </div>
      </section>

      <section id='blog' className='px-4 py-28 sm:px-6 lg:px-8 lg:py-44'>
        <div className='ym-reveal mx-auto max-w-[1180px] text-center'>
          <p className='text-sm text-black/45 dark:text-white/45'>
            The people behind the work
          </p>
          <h2 className='mx-auto mt-7 max-w-4xl text-balance font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
            Built for every kind of builder.
          </h2>
        </div>
        <div className='mx-auto mt-16 grid max-w-[1180px] gap-4 lg:grid-cols-3'>
          {testimonials.map((item, index) => (
            <article
              key={item.name}
              className={`ym-reveal flex min-h-[23rem] flex-col rounded-[18px] p-7 sm:p-8 ${
                index === 1
                  ? 'bg-[#17213a] text-white'
                  : index === 2
                    ? 'bg-[#dbe4da] text-[#17213a]'
                    : 'bg-[#efece4] text-[#171717]'
              }`}
            >
              <span className='font-display text-5xl leading-none opacity-30'>
                “
              </span>
              <p className='mt-5 text-xl leading-8 tracking-[-0.025em]'>
                {item.quote}
              </p>
              <div className='mt-auto flex items-end justify-between gap-4 border-t border-current/15 pt-6'>
                <p className='font-medium'>{item.name}</p>
                <p className='text-sm opacity-55'>{item.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id='updates' className='px-4 py-28 sm:px-6 lg:px-8 lg:py-44'>
        <div className='ym-reveal mx-auto grid max-w-[1180px] gap-16 border-y border-black/[0.09] py-20 dark:border-white/10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center'>
          <div>
            <p className='text-sm text-black/45 dark:text-white/45'>
              Always in motion
            </p>
            <h2 className='mt-7 max-w-xl text-balance font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-7xl'>
              One studio. A growing body of work.
            </h2>
          </div>
          <div className='grid grid-cols-2 gap-x-8 gap-y-12'>
            {milestones.map(([value, label]) => (
              <div key={label}>
                <p className='font-display text-5xl tracking-[-0.05em] sm:text-6xl'>
                  {value}
                </p>
                <p className='mt-3 max-w-32 text-sm leading-5 text-black/45 dark:text-white/45'>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32'>
        <div className='ym-reveal relative mx-auto min-h-[45rem] max-w-[1180px] overflow-hidden rounded-[22px] bg-[#f1eee7] sm:min-h-[40rem]'>
          <Image
            fill
            src='/landing/youmind-telos/cta.webp'
            alt='T waiting beside a clear workspace'
            sizes='(min-width: 1280px) 1180px, 100vw'
            className='hidden object-cover object-center sm:block'
          />
          <div className='absolute inset-x-0 bottom-0 h-[46%] sm:hidden'>
            <Image
              fill
              src='/landing/youmind-telos/cta.webp'
              alt=''
              sizes='100vw'
              className='object-cover object-[72%_center]'
            />
          </div>
          <div className='absolute inset-x-0 top-0 z-10 p-8 sm:inset-y-0 sm:right-auto sm:flex sm:w-[58%] sm:flex-col sm:justify-center sm:p-14 lg:p-20'>
            <p className='text-xs font-medium uppercase tracking-[0.18em] text-[#17213a]/50'>
              {t('landing.cta.eyebrow')}
            </p>
            <h2 className='mt-6 max-w-xl text-balance font-display text-5xl font-semibold leading-[0.93] tracking-[-0.05em] text-[#17213a] sm:text-7xl'>
              Bring your next idea to life.
            </h2>
            <p className='mt-6 max-w-md text-base leading-7 text-[#17213a]/60'>
              Start with a sentence. T will help you gather the context, shape
              the agent, and turn the work into something real.
            </p>
            <div className='mt-9'>
              <CustomLink href={signedIn ? '/chat' : '/auth/signin'}>
                <Button className='h-12 rounded-full bg-[#17213a] px-6 text-white shadow-none hover:bg-[#27334f]'>
                  {signedIn ? t('dashboard') : t('cta.getStarted')}
                  <ArrowUpRight className='ml-2 size-4' />
                </Button>
              </CustomLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
