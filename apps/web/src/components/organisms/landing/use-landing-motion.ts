'use client'

import { type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export function useLandingMotion(
  root: RefObject<HTMLElement | null>,
  paused: boolean
) {
  useGSAP(
    () => {
      if (paused || !root.current) return
      const media = gsap.matchMedia()
      media.add(
        '(prefers-reduced-motion: no-preference)',
        () => {
          const page = root.current!
          const select = gsap.utils.selector(page)
          gsap.from(select('[data-intro]'), {
            y: 32,
            opacity: 0.15,
            duration: 1,
            stagger: 0.12,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          })
          select('[data-reveal]').forEach((element: HTMLElement) => {
            gsap.from(element, {
              y: 48,
              opacity: 0.15,
              duration: 1.05,
              ease: 'power3.out',
              scrollTrigger: { trigger: element, start: 'top 90%', once: true },
              clearProps: 'transform,opacity',
            })
          })
          const scene = select('[data-world]')[0]
          gsap.fromTo(
            scene,
            { scale: 0.91, borderRadius: 48 },
            {
              scale: 1,
              borderRadius: 18,
              ease: 'none',
              scrollTrigger: {
                trigger: scene,
                start: 'top bottom',
                end: 'top 18%',
                scrub: 0.7,
              },
            }
          )
          gsap.fromTo(
            select('[data-world-image]'),
            { yPercent: -6, scale: 1.16 },
            {
              yPercent: 6,
              scale: 1.06,
              ease: 'none',
              scrollTrigger: {
                trigger: scene,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8,
              },
            }
          )
          const float = gsap.to(select('[data-mote]'), {
            y: -38,
            x: 16,
            rotation: 25,
            duration: 4.5,
            stagger: 0.35,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            paused: true,
          })
          ScrollTrigger.create({
            trigger: scene,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: self => {
              if (self.isActive) float.resume()
              else float.pause()
            },
          })
          select('[data-chapter]').forEach(
            (element: HTMLElement, index: number) => {
              gsap.from(element, {
                y: 75,
                rotation: (index - 1) * 3,
                opacity: 0.2,
                duration: 1.1,
                delay: window.innerWidth > 700 ? index * 0.12 : 0,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 92%',
                  once: true,
                },
              })
            }
          )
          const resize = new ResizeObserver(() => ScrollTrigger.refresh())
          resize.observe(page)
          return () => resize.disconnect()
        },
        root
      )
      media.add(
        '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const page = root.current!
          let active: HTMLElement | null = null
          let frame = 0
          const reset = () => {
            cancelAnimationFrame(frame)
            active?.style.removeProperty('--tilt-x')
            active?.style.removeProperty('--tilt-y')
            active?.style.removeProperty('--light-x')
            active?.style.removeProperty('--light-y')
            active = null
          }
          const move = (event: PointerEvent) => {
            const card = (event.target as HTMLElement).closest<HTMLElement>(
              '[data-tilt]'
            )
            if (card !== active) {
              reset()
              active = card
            }
            if (!card) return
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
              const box = card.getBoundingClientRect()
              const x = Math.max(
                0,
                Math.min(1, (event.clientX - box.left) / box.width)
              )
              const y = Math.max(
                0,
                Math.min(1, (event.clientY - box.top) / box.height)
              )
              card.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`)
              card.style.setProperty('--tilt-y', `${(x - 0.5) * 9}deg`)
              card.style.setProperty('--light-x', `${x * 100}%`)
              card.style.setProperty('--light-y', `${y * 100}%`)
            })
          }
          page.addEventListener('pointermove', move, { passive: true })
          page.addEventListener('pointerleave', reset)
          return () => {
            reset()
            page.removeEventListener('pointermove', move)
            page.removeEventListener('pointerleave', reset)
          }
        },
        root
      )
      return () => media.revert()
    },
    { scope: root, dependencies: [paused], revertOnUpdate: true }
  )
}
