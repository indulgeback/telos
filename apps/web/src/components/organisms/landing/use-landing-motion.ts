'use client'

import { type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export function useLandingMotion(root: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (!root.current) return
        const select = gsap.utils.selector(root.current)
        gsap.from(select('[data-intro]'), {
          y: 16,
          opacity: 0.3,
          duration: 0.65,
          stagger: 0.07,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        })
        select('[data-reveal]').forEach((element: HTMLElement) => {
          gsap.from(element, {
            y: 22,
            opacity: 0.3,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: element, start: 'top 94%', once: true },
            clearProps: 'transform,opacity',
          })
        })
        const resize = new ResizeObserver(() => ScrollTrigger.refresh())
        resize.observe(root.current)
        return () => resize.disconnect()
      })
      return () => media.revert()
    },
    { scope: root }
  )
}
