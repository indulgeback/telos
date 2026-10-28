'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, ArrowUpRight, Play, X } from 'lucide-react'
import { Link, useRouter } from '@/i18n/navigation'
import { TelosLogo } from '@/components/atoms/telos-logo'
import { authClient } from '@/lib/auth-client'
import { useLandingMotion } from './landing/use-landing-motion'
import { getLandingStartHref } from './landing/landing-utils'
import s from './landing/landing-world.module.css'

const modes = [
  'all',
  'research',
  'write',
  'image',
  'web',
  'code',
  'plan',
] as const
const ideas = [
  { id: 'editorial', mode: 'write', image: 'editorial.webp' },
  { id: 'website', mode: 'web', image: 'website.svg' },
  { id: 'botanical', mode: 'image', image: 'botanical.webp' },
  { id: 'research', mode: 'research', image: 'research.svg' },
  { id: 'travel', mode: 'plan', image: 'travel.webp' },
  { id: 'architecture', mode: 'image', image: 'architecture.webp' },
  { id: 'story', mode: 'write', image: 'story.svg' },
  { id: 'code', mode: 'code', image: 'code.svg' },
] as const
const chapters = ['gather', 'think', 'make'] as const
const gallery = [ideas[1], ideas[2], ideas[0], ideas[4], ideas[3], ideas[6]]
type Idea = (typeof ideas)[number]

export function LandingPage() {
  const t = useTranslations('LandingStudio')
  const locale = useLocale()
  const chineseCaptions = locale === 'zh' || locale === 'tw'
  const router = useRouter()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [mode, setMode] = useState<(typeof modes)[number]>('all')
  const [prompt, setPrompt] = useState('')
  const [focused, setFocused] = useState(false)
  const [preview, setPreview] = useState<Idea | null>(null)
  const [videoStarted, setVideoStarted] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const root = useRef<HTMLElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const sessionRef = useRef(session)
  const sessionPendingRef = useRef(sessionPending)
  useLandingMotion(root)

  useEffect(() => {
    sessionRef.current = session
    sessionPendingRef.current = sessionPending
  }, [session, sessionPending])

  useEffect(() => {
    if (preview) dialog.current?.showModal()
  }, [preview])

  useEffect(() => {
    if (videoStarted) video.current?.focus({ preventScroll: true })
  }, [videoStarted])

  const visibleIdeas =
    mode === 'all' ? ideas : ideas.filter(idea => idea.mode === mode)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!prompt.trim()) return
    const deadline = Date.now() + 2_000
    while (sessionPendingRef.current && Date.now() < deadline) {
      await new Promise(resolve => window.setTimeout(resolve, 50))
    }
    router.push(getLandingStartHref(Boolean(sessionRef.current), prompt))
  }

  function beginIdea(text: string) {
    dialog.current?.close()
    setPreview(null)
    setPrompt(text)
    input.current?.focus({ preventScroll: true })
    input.current?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }

  const startHref = sessionPending
    ? '/chat'
    : getLandingStartHref(Boolean(session))

  return (
    <main id='main-content' ref={root} className={s.world}>
      <section id='overview' className={s.hero}>
        <div className={s.heroCopy}>
          <h1 data-intro>{t('v5.title')}</h1>
          <p data-intro className={s.intro}>
            {t('v5.intro')}
          </p>
        </div>
        <form
          data-intro
          id='start'
          className={s.composer}
          data-focused={focused}
          onSubmit={submit}
        >
          <label htmlFor='idea-prompt' className={s.srOnly}>
            {t('promptLabel')}
          </label>
          <textarea
            ref={input}
            id='idea-prompt'
            value={prompt}
            maxLength={2000}
            onChange={event => setPrompt(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t('v5.placeholder')}
            rows={1}
            required
          />
          <div className={s.composerBar}>
            <span className={s.composerIdentity}>
              <Image
                src='/brand/t-v4/portrait.webp'
                alt=''
                width={28}
                height={28}
              />
              <span>{t('v5.withT')}</span>
            </span>
            <button type='submit' className={s.send} disabled={!prompt.trim()}>
              {t('v5.start')} <ArrowRight size={17} aria-hidden='true' />
            </button>
          </div>
        </form>
        <div
          data-intro
          className={s.tabs}
          role='group'
          aria-label={t('chooseScene')}
        >
          {modes.map(key => (
            <button
              key={key}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              {t(`v5.categories.${key}`)}
            </button>
          ))}
        </div>
        <div className={s.ideas} aria-live='polite'>
          {visibleIdeas.map(idea => (
            <button
              key={idea.id}
              className={s.idea}
              onClick={() => beginIdea(t(`v5.examples.${idea.id}.prompt`))}
            >
              <div className={s.ideaImage}>
                <Image
                  src={`/landing/showcase/${idea.image}`}
                  alt=''
                  fill
                  sizes='(max-width: 600px) 45vw, (max-width: 900px) 30vw, 240px'
                />
                <span className={s.ideaAction} aria-hidden='true'>
                  <ArrowUpRight size={17} />
                </span>
              </div>
              <span>{t(`v5.examples.${idea.id}.title`)}</span>
            </button>
          ))}
        </div>
        <p className={s.exampleNote}>{t('v5.exampleNote')}</p>
      </section>

      <section id='possibilities' className={s.possibilities}>
        <div data-reveal className={s.sectionHeading}>
          <h2>{t('v5.processTitle')}</h2>
          <p>{t('v5.processIntro')}</p>
        </div>
        <div className={s.chapters}>
          {chapters.map(key => (
            <article key={key} data-reveal className={s.chapter}>
              <button
                className={s.chapterArt}
                onClick={() => beginIdea(t(`v3.chapters.${key}.prompt`))}
                aria-label={t(`v3.chapters.${key}.action`)}
              >
                <Image
                  src={`/brand/t-v4/${key}.webp`}
                  alt={t(`v3.chapters.${key}.alt`)}
                  fill
                  sizes='(max-width: 700px) 90vw, 360px'
                />
                <span className={s.chapterArrow} aria-hidden='true'>
                  <ArrowUpRight size={20} />
                </span>
              </button>
              <h3>{t(`v5.steps.${key}.title`)}</h3>
              <p>{t(`v5.steps.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id='demo' className={s.demo} aria-labelledby='demo-heading'>
        <div data-reveal className={s.sectionHeading}>
          <h2 id='demo-heading'>{t('v5.demoTitle')}</h2>
          <p>{t('v5.demoIntro')}</p>
        </div>
        <div className={s.videoFrame}>
          {videoStarted ? (
            <video
              ref={video}
              tabIndex={0}
              className={s.video}
              controls
              autoPlay
              playsInline
              preload='metadata'
              poster='/demo/telos-workflow-poster.webp'
              aria-label={t('v5.demoTitle')}
              onError={() => setVideoError(true)}
            >
              <source
                src='/demo/telos-workflow.mp4'
                type='video/mp4'
                onError={() => setVideoError(true)}
              />
              <track
                default={chineseCaptions}
                kind='captions'
                src='/demo/telos-workflow-zh.vtt'
                srcLang='zh'
                label='中文'
              />
              <track
                default={!chineseCaptions}
                kind='captions'
                src='/demo/telos-workflow-en.vtt'
                srcLang='en'
                label='English'
              />
              {t('v5.videoUnsupported')}
            </video>
          ) : (
            <button
              className={s.videoPoster}
              onClick={() => setVideoStarted(true)}
              aria-label={t('v5.watchDemo')}
            >
              <Image
                src='/demo/telos-workflow-poster.webp'
                alt=''
                fill
                sizes='(max-width: 900px) 92vw, 1100px'
              />
              <span className={s.playButton}>
                <Play size={27} fill='currentColor' aria-hidden='true' />
              </span>
              <span className={s.videoCaption}>
                {t('v5.watchDemo')}{' '}
                <ArrowUpRight size={18} aria-hidden='true' />
              </span>
            </button>
          )}
        </div>
        <p className={s.disclosure}>{t('v5.demoDisclosure')}</p>
        {videoError && (
          <p role='alert' className={s.videoError}>
            {t('v5.videoError')}{' '}
            <a href='/demo/telos-workflow.mp4'>{t('v5.openVideo')}</a>
          </p>
        )}
      </section>

      <section id='showcase' className={s.showcase}>
        <div data-reveal className={s.sectionHeading}>
          <h2>{t('v5.galleryTitle')}</h2>
          <p>{t('v5.galleryIntro')}</p>
        </div>
        <div className={s.gallery}>
          {gallery.map(idea => (
            <button
              key={idea.id}
              className={s.galleryCard}
              onClick={() => setPreview(idea)}
              aria-label={t('v5.previewNamed', {
                name: t(`v5.examples.${idea.id}.title`),
              })}
            >
              <div className={s.galleryImage}>
                <Image
                  src={`/landing/showcase/${idea.image}`}
                  alt=''
                  fill
                  sizes='(max-width: 600px) 90vw, (max-width: 900px) 45vw, 360px'
                />
                <span className={s.galleryOpen}>
                  <ArrowUpRight size={20} aria-hidden='true' />
                </span>
              </div>
              <span className={s.galleryLabel}>
                {t(`v5.examples.${idea.id}.title`)}
                <span>{t(`v5.categories.${idea.mode}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id='meet-t' className={s.meet}>
        <div data-reveal className={s.meetPortrait}>
          <Image
            src='/brand/t-v4/portrait.webp'
            alt={t('portraitAlt')}
            fill
            sizes='(max-width: 700px) 90vw, 420px'
          />
        </div>
        <div data-reveal className={s.meetCopy}>
          <h2>{t('v5.meetTitle')}</h2>
          <p>{t('v5.meetBody')}</p>
          <Link className={s.textLink} href={startHref}>
            {t('v5.meetAction')} <ArrowRight size={18} aria-hidden='true' />
          </Link>
          <div className={s.faq}>
            {(['start', 'control', 'skills'] as const).map(key => (
              <details key={key}>
                <summary>
                  {t(`v5.faq.${key}.question`)}
                  <span aria-hidden='true'>+</span>
                </summary>
                <p>{t(`v5.faq.${key}.answer`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className={s.finalSection}>
        <h2>{t('v5.finalTitle')}</h2>
        <a href='#start' className={s.primary}>
          {t('v5.finalAction')} <ArrowRight size={18} aria-hidden='true' />
        </a>
      </section>
      <footer className={s.footer}>
        <Link href='/' className={s.brand} aria-label='Telos'>
          <TelosLogo />
        </Link>
        <div>
          <Link href='/skills'>{t('navSkills')}</Link>
          <Link href='/privacy-policy'>{t('privacy')}</Link>
          <Link href='/terms-of-service'>{t('terms')}</Link>
          <a
            href='https://github.com/indulgeback/telos'
            target='_blank'
            rel='noopener noreferrer'
          >
            GitHub
          </a>
        </div>
        <span>© 2026 Telos</span>
      </footer>

      <dialog
        ref={dialog}
        className={s.previewDialog}
        onClose={() => setPreview(null)}
        onClick={event => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
        aria-labelledby='preview-title'
      >
        {preview && (
          <div className={s.previewInner}>
            <button
              className={s.closePreview}
              aria-label={t('v5.closePreview')}
              onClick={() => dialog.current?.close()}
            >
              <X size={22} />
            </button>
            <div className={s.previewImage}>
              <Image
                src={`/landing/showcase/${preview.image}`}
                alt={t(`v5.examples.${preview.id}.title`)}
                fill
                sizes='(max-width: 700px) 90vw, 800px'
              />
            </div>
            <div className={s.previewCopy}>
              <span className={s.previewTag}>{t('v5.exampleLabel')}</span>
              <h2 id='preview-title'>{t(`v5.examples.${preview.id}.title`)}</h2>
              <p>{t(`v5.examples.${preview.id}.prompt`)}</p>
              <button
                className={s.primary}
                onClick={() => beginIdea(t(`v5.examples.${preview.id}.prompt`))}
              >
                {t('v5.usePrompt')} <ArrowRight size={18} aria-hidden='true' />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  )
}
