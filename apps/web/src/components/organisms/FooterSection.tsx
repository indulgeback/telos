'use client'

import { useRef, useEffect } from 'react'
import { animate } from 'animejs'

export function FooterSection() {
  const footerRef = useRef(null)

  useEffect(() => {
    if (footerRef.current) {
      animate(footerRef.current, {
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutCubic',
      })
    }
  }, [])

  return (
    <footer ref={footerRef} className='py-12 bg-slate-900 dark:bg-black'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
        <p className='text-slate-400'>
          © 2024 Telos. Built with Next.js, Go, and ❤️
        </p>
      </div>
    </footer>
  )
}
