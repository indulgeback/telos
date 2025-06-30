import { useTranslations } from 'next-intl'
import { Play, Server, Database, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components'

export default function QuickStartSection() {
  const t = useTranslations('HomePage')
  return (
    <section className='py-20 bg-white dark:bg-slate-900' id='quick-start'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
        <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8'>
          {t('quickStart.title')}
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
          <div className='p-6 rounded-xl border border-slate-200 dark:border-slate-700'>
            <Play className='h-8 w-8 mx-auto mb-4 text-blue-600 dark:text-blue-400' />
            <h3 className='font-semibold text-slate-900 dark:text-white mb-2'>
              {t('quickStart.frontend')}
            </h3>
            <code className='text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded'>
              pnpm dev
            </code>
          </div>
          <div className='p-6 rounded-xl border border-slate-200 dark:border-slate-700'>
            <Server className='h-8 w-8 mx-auto mb-4 text-green-600 dark:text-green-400' />
            <h3 className='font-semibold text-slate-900 dark:text-white mb-2'>
              {t('quickStart.backend')}
            </h3>
            <code className='text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded'>
              go run main.go
            </code>
          </div>
          <div className='p-6 rounded-xl border border-slate-200 dark:border-slate-700'>
            <Database className='h-8 w-8 mx-auto mb-4 text-orange-600 dark:text-orange-400' />
            <h3 className='font-semibold text-slate-900 dark:text-white mb-2'>
              {t('quickStart.database')}
            </h3>
            <code className='text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded'>
              docker-compose up
            </code>
          </div>
        </div>
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Button size='lg' variant='outline'>
            <BookOpen className='mr-2 h-4 w-4' />
            {t('cta.viewDocs')}
          </Button>
          <Button size='lg'>
            {t('cta.learnMore')}
            <ArrowRight className='ml-2 h-4 w-4' />
          </Button>
        </div>
      </div>
    </section>
  )
}
