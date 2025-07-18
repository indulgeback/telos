'use client'

import { useRef, useEffect } from 'react'
import { animate, stagger } from 'animejs'
import { useTranslations } from 'next-intl'
import { Code2, Server, Cloud, Zap, Globe } from 'lucide-react'

export function FeaturesSection() {
  const t = useTranslations('HomePage')
  const titleRef = useRef(null)
  const cardsRef = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    // 标题动画
    if (titleRef.current) {
      animate(titleRef.current, {
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutCubic',
      })
    }
    // 卡片动画
    if (cardsRef.current && cardsRef.current.length > 0) {
      animate(cardsRef.current, {
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 700,
        delay: stagger(150),
        easing: 'easeOutCubic',
      })
    }
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
