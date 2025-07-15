'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function FooterSection() {
  const footerRef = useRef(null)
  useGSAP(() => {
    if (!footerRef.current) return
    gsap.fromTo(
      footerRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
    )
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
