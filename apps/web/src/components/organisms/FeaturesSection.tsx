'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useTranslations } from 'next-intl'
import { Code2, Server, Cloud, Zap, Globe } from 'lucide-react'
import { useGSAP } from '@gsap/react'

export function FeaturesSection() {
  const t = useTranslations('HomePage')
  const titleRef = useRef(null)
  const cardsRef = useRef<Array<HTMLDivElement | null>>([])
  useGSAP(() => {
    const tl = gsap.timeline()
    tl.fromTo(
      titleRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    ).fromTo(
      cardsRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out' },
      '-=0.4'
    )
  }, [])
  const features = [
    {
      icon: <Code2 className='h-6 w-6' />,
      title: t('features.frontend'),
      description: 'Next.js 15 + Shadcn UI',
    },
    {
      icon: <Server className='h-6 w-6' />,
      title: t('features.backend'),
      description: 'Go Microservices',
    },
    {
      icon: <Zap className='h-6 w-6' />,
      title: t('features.communication'),
      description: 'tRPC/gRPC',
    },
    {
      icon: <Globe className='h-6 w-6' />,
      title: t('features.monorepo'),
      description: 'Unified Management',
    },
    {
      icon: <Cloud className='h-6 w-6' />,
      title: t('features.deployment'),
      description: 'Docker + K8s',
    },
  ]
  return (
    <section className='py-20 bg-white dark:bg-slate-900' id='features'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2
            ref={titleRef}
            className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4'
          >
            {t('features.title')}
          </h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {features.map((feature, index) => (
            <div
              key={index}
              ref={el => {
                cardsRef.current[index] = el
              }}
              className='p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all duration-300'
            >
              <div className='flex items-center mb-4'>
                <div className='p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'>
                  {feature.icon}
                </div>
              </div>
              <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-2'>
                {feature.title}
              </h3>
              <p className='text-slate-600 dark:text-slate-400'>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
