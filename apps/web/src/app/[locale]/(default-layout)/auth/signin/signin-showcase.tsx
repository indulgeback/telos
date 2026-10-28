'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pause, Play } from 'lucide-react'
import s from './signin.module.css'

const slides = [
  { image: '01-world-models.webp', caption: 'models' },
  { image: '02-save-anything.webp', caption: 'collect' },
  { image: '03-skills.webp', caption: 'skills' },
  { image: '04-creative-partner.webp', caption: 'partner' },
  { image: '05-ai-studio.webp', caption: 'studio' },
] as const

export function SignInShowcase() {
  const t = useTranslations('Auth.signIn')
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(
      '(min-width: 1100px) and (prefers-reduced-motion: no-preference)'
    )
    let timer: ReturnType<typeof setInterval> | undefined
    const syncPlayback = () => {
      clearInterval(timer)
      if (!media.matches || paused || hovered || focused || document.hidden)
        return
      timer = setInterval(
        () => setActive(index => (index + 1) % slides.length),
        6000
      )
    }
    syncPlayback()
    media.addEventListener('change', syncPlayback)
    document.addEventListener('visibilitychange', syncPlayback)
    return () => {
      clearInterval(timer)
      media.removeEventListener('change', syncPlayback)
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [paused, hovered, focused])
  return (
    <aside
      className={s.showcase}
      aria-label={t('heroTitle')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false)
      }}
    >
      {slides.map(({ image, caption }, index) => (
        <div
          key={image}
          className={s.slide}
          data-active={index === active}
          aria-hidden={index !== active}
        >
          <Image
            src={`/auth/telos-v1/${image}`}
            alt=''
            fill
            priority={index === 0}
            sizes='(max-width: 1099px) 0px, (min-aspect-ratio: 16/9) 90vh, 55vw'
          />
          <p className={s.slideCaption}>{t(`slides.${caption}`)}</p>
        </div>
      ))}
      <button
        type='button'
        className={s.playback}
        onClick={() => setPaused(value => !value)}
        aria-label={t(paused ? 'resumeSlides' : 'pauseSlides')}
      >
        {paused ? (
          <Play size={16} aria-hidden='true' />
        ) : (
          <Pause size={16} aria-hidden='true' />
        )}
      </button>
      <div className={s.pagination}>
        {slides.map(({ image }, index) => (
          <button
            key={image}
            type='button'
            aria-label={t('slideLabel', { number: index + 1 })}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
          >
            <span />
          </button>
        ))}
      </div>
    </aside>
  )
}
