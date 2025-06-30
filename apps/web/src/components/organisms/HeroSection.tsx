import { Badge, Button } from '@/components'
import { Zap, ArrowRight, Github } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function HeroSection() {
  const t = useTranslations('HomePage')
  return (
    <section className='relative overflow-hidden' id='hero'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16'>
        <div className='text-center'>
          <Badge variant='secondary' className='mb-4'>
            <Zap className='h-4 w-4 mr-2' />
            Intelligent Workflow Orchestration
          </Badge>
          <h1 className='text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6'>
            {t('title')}
          </h1>
          <p className='text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto'>
            {t('subtitle')}
          </p>
          <p className='text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto'>
            {t('description')}
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button size='lg' className='group'>
              {t('cta.getStarted')}
              <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
            </Button>
            <Button variant='outline' size='lg'>
              <Github className='mr-2 h-4 w-4' />
              GitHub
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
