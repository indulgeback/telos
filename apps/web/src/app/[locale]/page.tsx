import { useTranslations } from 'next-intl'
import { Button, Badge } from '@/components'
import {
  Code2,
  Server,
  Database,
  Cloud,
  Zap,
  Globe,
  ArrowRight,
  Github,
  BookOpen,
  Play,
} from 'lucide-react'

export default function Home() {
  const t = useTranslations('HomePage')

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

  const techStacks = [
    {
      category: t('techStack.frontend.title'),
      items: [
        { name: 'Next.js 15', desc: t('techStack.frontend.nextjs') },
        { name: 'Shadcn UI', desc: t('techStack.frontend.shadcn') },
        { name: 'TypeScript', desc: t('techStack.frontend.typescript') },
        { name: 'tRPC', desc: t('techStack.frontend.trpc') },
        { name: 'Zustand', desc: t('techStack.frontend.zustand') },
      ],
    },
    {
      category: t('techStack.backend.title'),
      items: [
        { name: 'Go', desc: t('techStack.backend.go') },
        { name: 'Gin/Echo', desc: t('techStack.backend.gin') },
        { name: 'gRPC', desc: t('techStack.backend.grpc') },
        { name: 'PostgreSQL', desc: t('techStack.backend.postgresql') },
        { name: 'Redis', desc: t('techStack.backend.redis') },
      ],
    },
    {
      category: t('techStack.infrastructure.title'),
      items: [
        { name: 'Docker', desc: t('techStack.infrastructure.docker') },
        { name: 'Kubernetes', desc: t('techStack.infrastructure.kubernetes') },
        { name: 'Helm', desc: t('techStack.infrastructure.helm') },
        {
          name: 'Prometheus + Grafana',
          desc: t('techStack.infrastructure.monitoring'),
        },
        { name: 'Jaeger', desc: t('techStack.infrastructure.tracing') },
      ],
    },
  ]

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
      {/* Hero Section */}
      <section className='relative overflow-hidden'>
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

      {/* Features Section */}
      <section className='py-20 bg-white dark:bg-slate-900'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4'>
              {t('features.title')}
            </h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map((feature, index) => (
              <div
                key={index}
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

      {/* Tech Stack Section */}
      <section className='py-20 bg-slate-50 dark:bg-slate-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4'>
              {t('architecture.title')}
            </h2>
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {techStacks.map((stack, index) => (
              <div key={index} className='space-y-6'>
                <h3 className='text-xl font-semibold text-slate-900 dark:text-white text-center'>
                  {stack.category}
                </h3>
                <div className='space-y-4'>
                  {stack.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className='p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    >
                      <h4 className='font-medium text-slate-900 dark:text-white mb-1'>
                        {item.name}
                      </h4>
                      <p className='text-sm text-slate-600 dark:text-slate-400'>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className='py-20 bg-white dark:bg-slate-900'>
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
                go run cmd/main.go
              </code>
            </div>
            <div className='p-6 rounded-xl border border-slate-200 dark:border-slate-700'>
              <Cloud className='h-8 w-8 mx-auto mb-4 text-purple-600 dark:text-purple-400' />
              <h3 className='font-semibold text-slate-900 dark:text-white mb-2'>
                {t('quickStart.allServices')}
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

      {/* Footer */}
      <footer className='py-12 bg-slate-900 dark:bg-black'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <p className='text-slate-400'>
            © 2024 Telos. Built with Next.js, Go, and ❤️
          </p>
        </div>
      </footer>
    </div>
  )
}
