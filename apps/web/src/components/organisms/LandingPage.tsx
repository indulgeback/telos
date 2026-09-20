'use client'

import Image from 'next/image'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { TelosLogo } from '@/components/atoms/telos-logo'
import { authClient } from '@/lib/auth-client'
import { useLandingMotion } from './landing/use-landing-motion'
import { getLandingStartHref } from './landing/landing-utils'
import s from './landing/landing-world.module.css'

const modes = ['all', 'build', 'explore', 'create'] as const
const ideas = [
  { id: 'website', mode: 'build', art: 'make' },
  { id: 'research', mode: 'explore', art: 'gather' },
  { id: 'story', mode: 'create', art: 'think' },
  { id: 'debug', mode: 'build', art: 'think' },
  { id: 'learn', mode: 'explore', art: 'make' },
  { id: 'writing', mode: 'create', art: 'gather' },
] as const
const chapters = ['gather', 'think', 'make'] as const

export function LandingPage() {
  const t = useTranslations('LandingStudio')
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [mode, setMode] = useState<(typeof modes)[number]>('all')
  const [prompt, setPrompt] = useState('')
  const [focused, setFocused] = useState(false)
  const root = useRef<HTMLElement>(null)
  const [motionPaused, setMotionPaused] = useState(false)
  useLandingMotion(root, motionPaused)
  const input = useRef<HTMLTextAreaElement>(null)
  const visibleIdeas =
    mode === 'all'
      ? ideas.slice(0, 3)
      : ideas.filter(idea => idea.mode === mode)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (prompt.trim())
      router.push(getLandingStartHref(Boolean(session), prompt))
  }

  function beginIdea(text: string) {
    setPrompt(text)
    input.current?.focus({ preventScroll: true })
    input.current?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }

  return (
    <main
      id='main-content'
      ref={root}
      className={s.world}
      data-motion-paused={motionPaused}
    >
      <section id='overview' className={s.hero}>
        <div className={s.heroCopy}>
          <p data-intro className={s.eyebrow}>
            {t('v3.eyebrow')}
          </p>
          <h1 data-intro>
            {t('title')} <em>{t('titleAccent')}</em>
          </h1>
          <p data-intro className={s.intro}>
            {t('intro')}
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
            placeholder={t('placeholder')}
            rows={2}
            required
          />
          <div className={s.composerBar}>
            <span className={s.composerIdentity}>
              <Image
                src='/landing/t-v2/portrait.webp'
                alt=''
                width={28}
                height={28}
              />
              <span>{t('v3.withT')}</span>
            </span>
            <button
              type='submit'
              className={s.send}
              disabled={!prompt.trim()}
              aria-label={t('submit')}
            >
              {t('v3.send')} <span aria-hidden='true'>↗</span>
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
              {key === 'all' ? t('v3.recommended') : t(`scenes.${key}.label`)}
            </button>
          ))}
        </div>
        <div key={mode} className={s.ideas} aria-live='polite'>
          {visibleIdeas.map(idea => (
            <button
              key={idea.id}
              className={s.idea}
              data-tilt
              onClick={() => beginIdea(t(`v3.ideas.${idea.id}.prompt`))}
            >
              <div className={s.ideaImage}>
                <Image
                  src={`/landing/t-v3/${idea.art}.webp`}
                  alt=''
                  fill
                  sizes='(max-width: 600px) 70vw, 300px'
                />
                <span className={s.ideaAction} aria-hidden='true'>
                  ↗
                </span>
              </div>
              <span>{t(`v3.ideas.${idea.id}.title`)}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        data-world
        className={s.worldScene}
        aria-label={t('v3.worldLabel')}
      >
        <Image
          data-world-image
          src='/landing/t-v3/hero.webp'
          alt={t('v3.heroAlt')}
          fill
          sizes='100vw'
        />
        <div className={s.atmosphere} aria-hidden='true'>
          {[0, 1, 2, 3, 4, 5].map(index => (
            <i key={index} data-mote />
          ))}
        </div>
        <button
          className={s.motionToggle}
          onClick={() => setMotionPaused(!motionPaused)}
          aria-pressed={motionPaused}
          aria-label={t(motionPaused ? 'motion.resume' : 'motion.pause')}
        >
          <span aria-hidden='true'>{motionPaused ? '▷' : 'Ⅱ'}</span>
        </button>
        <div className={s.sceneCaption}>
          <span>{t('v3.worldCaption')}</span>
          <a href='#possibilities' aria-label={t('v3.navExplore')}>
            ↓
          </a>
        </div>
      </section>

      <section id='possibilities' className={s.possibilities}>
        <div data-reveal className={s.sectionHeading}>
          <h2>
            {t('v3.processTitle')}
            <br />
            <em>{t('v3.processAccent')}</em>
          </h2>
          <p>{t('v3.processIntro')}</p>
        </div>
        <div className={s.chapters}>
          {chapters.map(key => (
            <article key={key} data-chapter className={s.chapter}>
              <button
                className={s.chapterArt}
                data-tilt
                onClick={() => beginIdea(t(`v3.chapters.${key}.prompt`))}
                aria-label={t(`v3.chapters.${key}.action`)}
              >
                <Image
                  src={`/landing/t-v3/${key}.webp`}
                  alt={t(`v3.chapters.${key}.alt`)}
                  fill
                  sizes='(max-width: 700px) 100vw, 33vw'
                />
                <span className={s.chapterTitle}>
                  {t(`v3.chapters.${key}.title`)}
                </span>
                <span className={s.chapterArrow} aria-hidden='true'>
                  ↗
                </span>
              </button>
              <p>{t(`v3.chapters.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id='meet-t' className={s.meet}>
        <div data-reveal className={s.meetPortrait}>
          <Image
            src='/landing/t-v2/portrait.webp'
            alt={t('portraitAlt')}
            fill
            sizes='(max-width: 700px) 100vw, 420px'
          />
          <span className={s.signature}>T.</span>
        </div>
        <div data-reveal className={s.meetCopy}>
          <p className={s.eyebrow}>{t('v3.meetEyebrow')}</p>
          <h2>
            {t('v3.meetTitle')}
            <br />
            <em>{t('v3.meetAccent')}</em>
          </h2>
          <p>{t('v3.meetBody')}</p>
          <div className={s.meetLinks}>
            <Link
              className={s.primary}
              href={getLandingStartHref(Boolean(session))}
            >
              {t('start')} <span aria-hidden='true'>↗</span>
            </Link>
            <Link className={s.textLink} href='/skills'>
              {t('v3.browseSkills')} <span aria-hidden='true'>↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section data-reveal className={s.finalSection}>
        <p>{t('v3.finalIntro')}</p>
        <h2>
          {t('finalTitle')} <em>{t('finalAccent')}</em>
        </h2>
        <a href='#start' className={s.primary}>
          {t('v3.finalAction')} <span aria-hidden='true'>↑</span>
        </a>
      </section>
      <footer className={s.footer}>
        <Link href='/' className={s.brand} aria-label='Telos'>
          <TelosLogo />
        </Link>
        <div>
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
    </main>
  )
}
