import { Badge, Button } from '@/components/atoms'
import { Zap, ArrowRight, Github } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CustomLink } from '@/components/molecules'

export function HeroSection() {
  const t = useTranslations('HomePage')
  return (
    <section className='relative overflow-hidden' id='hero'>
      {/* 更明显的渐变+多层光斑背景层（HEX色值） */}
      <div className='absolute inset-0 pointer-events-none'>
        {/* 主色大光斑 */}
        <div className='absolute left-1/2 top-[-10vw] w-[50vw] h-[30vw] max-w-5xl -translate-x-1/2 bg-gradient-to-br from-[#40669bcc] to-transparent rounded-full blur-[120px] opacity-90' />
        {/* 小光斑 */}
        <div className='absolute left-[60vw] top-[30vw] w-[40vw] h-[30vw] bg-[#a3b9dfb3] rounded-full blur-[80px] opacity-80' />
        {/* 右下角次级光斑 */}
        <div className='absolute right-[-8vw] bottom-[-8vw] w-[40vw] h-[30vw] bg-[#5a7fae99] rounded-full blur-[100px] opacity-80' />
      </div>
      <div className='z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16'>
        <div className='text-center '>
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
            <CustomLink href='/docs'>
              <Button size='lg' className='group'>
                {t('cta.getStarted')}
                <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
              </Button>
            </CustomLink>
            <CustomLink
              href='https://github.com/indulgeback/telos'
              target='_blank'
            >
              <Button variant='outline' size='lg'>
                <Github className='mr-2 h-4 w-4' />
                GitHub
              </Button>
            </CustomLink>
          </div>
        </div>
      </div>
    </section>
  )
}
