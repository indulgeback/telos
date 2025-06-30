import { useTranslations } from 'next-intl'

export default function TechStackSection() {
  const t = useTranslations('HomePage')
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
    <section className='py-20 bg-slate-50 dark:bg-slate-800' id='tech-stack'>
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
  )
}
