'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import {
  SectionWrapper,
  SectionTitle,
  GradientBlob,
  CTASection,
} from '@/components/molecules'
import { comparisonData, competitors } from '@/data/comparison'
import {
  Check,
  X,
  Minus,
  Sparkles,
  GitBranch,
  Zap,
  Settings,
  Info,
  ChevronRight,
  Star,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { cn } from '@/lib/utils'

export default function ComparisonPage() {
  const t = useTranslations('ComparisonPage')
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([
    'telos',
    'n8n',
    'zapier',
    'make',
  ])

  const toggleCompetitor = (id: string) => {
    if (id === 'telos') return // Always show Telos
    setSelectedCompetitors(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev // Minimum 2 competitors
        return prev.filter(c => c !== id)
      }
      if (prev.length >= 4) return prev // Maximum 4 competitors
      return [...prev, id]
    })
  }

  const getFeatureValue = (value: string) => {
    switch (value) {
      case 'yes':
        return <Check className='h-5 w-5 text-green-500' />
      case 'partial':
        return <span className='text-yellow-500'>~</span>
      case 'premium':
        return <Star className='h-4 w-4 text-yellow-500' />
      default:
        return <X className='h-5 w-5 text-gray-400' />
    }
  }

  const getValueText = (value: string) => {
    switch (value) {
      case 'yes':
        return 'Yes'
      case 'partial':
        return 'Partial'
      case 'premium':
        return 'Premium'
      default:
        return 'No'
    }
  }

  const getLogo = (logo: string) => {
    switch (logo) {
      case 'Sparkles':
        return Sparkles
      case 'GitBranch':
        return GitBranch
      case 'Zap':
        return Zap
      case 'Settings':
        return Settings
      default:
        return Sparkles
    }
  }

  return (
    <main className='pt-20'>
      {/* Hero */}
      <section className='relative py-20 px-4 overflow-hidden'>
        <GradientBlob color='primary' size='lg' position='top-right' />
        <div className='max-w-4xl mx-auto text-center relative z-10'>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className='text-4xl md:text-5xl font-display font-bold text-foreground mb-6'
          >
            {t('hero.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className='text-xl text-muted-foreground'
          >
            {t('hero.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Competitor Selection */}
      <SectionWrapper variant='card'>
        <div className='mb-8'>
          <h3 className='font-semibold text-foreground mb-4 text-center'>
            {t('select.title')}
          </h3>
          <div className='flex flex-wrap justify-center gap-3'>
            {competitors.map(competitor => {
              const Icon = getLogo(competitor.logo)
              const isSelected = selectedCompetitors.includes(competitor.id)
              return (
                <button
                  key={competitor.id}
                  onClick={() => toggleCompetitor(competitor.id)}
                  disabled={competitor.id === 'telos'}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                    isSelected
                      ? competitor.id === 'telos'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground opacity-50',
                    competitor.id !== 'telos' && 'hover:opacity-100',
                    competitor.id === 'telos' && 'cursor-default'
                  )}
                >
                  <Icon className='h-4 w-4' />
                  {competitor.name}
                  {competitor.highlight && (
                    <Badge variant='secondary' className='ml-1 text-xs'>
                      You
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[600px]'>
            <thead>
              <tr className='border-b border-border'>
                <th className='text-left py-4 px-4 font-semibold text-foreground sticky left-0 bg-background z-10 min-w-[200px]'>
                  {t('table.feature')}
                </th>
                {selectedCompetitors.map(compId => {
                  const comp = competitors.find(c => c.id === compId)!
                  const Icon = getLogo(comp.logo)
                  return (
                    <th
                      key={compId}
                      className='text-center py-4 px-4 min-w-[120px]'
                    >
                      <div className='flex flex-col items-center gap-1'>
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            comp.id === 'telos' ? 'bg-primary/10' : 'bg-muted'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-5 w-5',
                              comp.id === 'telos'
                                ? 'text-primary'
                                : 'text-foreground'
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            'font-medium',
                            comp.id === 'telos'
                              ? 'text-primary'
                              : 'text-foreground'
                          )}
                        >
                          {comp.name}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((category, catIndex) => (
                <tr
                  key={category.category}
                  className={catIndex > 0 ? 'border-t-2 border-border' : ''}
                >
                  <td
                    colSpan={selectedCompetitors.length + 1}
                    className='py-3 px-4 bg-muted/30'
                  >
                    <span className='font-semibold text-foreground'>
                      {category.category}
                    </span>
                  </td>
                </tr>
              ))}
              {comparisonData.flatMap((category, catIndex) =>
                category.features.map((feature, featIndex) => (
                  <tr
                    key={`${catIndex}-${featIndex}`}
                    className='border-b border-border hover:bg-muted/30 transition-colors'
                  >
                    <td className='py-3 px-4 sticky left-0 bg-background hover:bg-muted/30 transition-colors'>
                      <div>
                        <div className='font-medium text-foreground'>
                          {feature.name}
                        </div>
                        {feature.description && (
                          <div className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1'>
                            <Info className='h-3 w-3' />
                            {feature.description}
                          </div>
                        )}
                      </div>
                    </td>
                    {selectedCompetitors.map(compId => (
                      <td key={compId} className='py-3 px-4 text-center'>
                        {getFeatureValue(
                          feature[compId as keyof typeof feature] as string
                        )}
                        <span className='sr-only'>
                          {getValueText(
                            feature[compId as keyof typeof feature] as string
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className='mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <Check className='h-4 w-4 text-green-500' />
            <span>{t('legend.yes')}</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-yellow-500'>~</span>
            <span>{t('legend.partial')}</span>
          </div>
          <div className='flex items-center gap-2'>
            <Star className='h-4 w-4 text-yellow-500' />
            <span>{t('legend.premium')}</span>
          </div>
          <div className='flex items-center gap-2'>
            <X className='h-4 w-4 text-gray-400' />
            <span>{t('legend.no')}</span>
          </div>
        </div>
      </SectionWrapper>

      {/* Key Differentiators */}
      <SectionWrapper>
        <SectionTitle
          title={t('differentiators.title')}
          description={t('differentiators.description')}
          variant='center'
        />
        <div className='grid md:grid-cols-3 gap-6 mt-8'>
          {[
            {
              icon: Sparkles,
              title: t('differentiators.ai.title'),
              description: t('differentiators.ai.description'),
            },
            {
              icon: GitBranch,
              title: t('differentiators.open.title'),
              description: t('differentiators.open.description'),
            },
            {
              icon: Settings,
              title: t('differentiators.self.title'),
              description: t('differentiators.self.description'),
            },
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className='p-6 rounded-xl bg-card border border-border text-center'
              >
                <div className='inline-flex p-3 rounded-lg bg-primary/10 mb-4'>
                  <Icon className='h-6 w-6 text-primary' />
                </div>
                <h3 className='font-semibold text-foreground mb-2'>
                  {item.title}
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {item.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Quick Verdict */}
      <SectionWrapper variant='card'>
        <h3 className='text-xl font-bold text-foreground mb-6 text-center'>
          {t('verdict.title')}
        </h3>
        <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[
            {
              name: 'Telos',
              recommendation: t('verdict.telos.recommendation'),
              description: t('verdict.telos.description'),
              color: 'primary',
              best: true,
            },
            {
              name: 'n8n',
              recommendation: t('verdict.n8n.recommendation'),
              description: t('verdict.n8n.description'),
              color: 'gray',
              best: false,
            },
            {
              name: 'Zapier',
              recommendation: t('verdict.zapier.recommendation'),
              description: t('verdict.zapier.description'),
              color: 'orange',
              best: false,
            },
            {
              name: 'Make',
              recommendation: t('verdict.make.recommendation'),
              description: t('verdict.make.description'),
              color: 'purple',
              best: false,
            },
          ].map(verdict => (
            <div
              key={verdict.name}
              className={cn(
                'p-4 rounded-xl border text-center',
                verdict.best
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              )}
            >
              {verdict.best && (
                <Badge variant='default' className='mb-2'>
                  Best for AI
                </Badge>
              )}
              <h4 className='font-semibold text-foreground mb-1'>
                {verdict.name}
              </h4>
              <p className='text-sm font-medium text-primary mb-2'>
                {verdict.recommendation}
              </p>
              <p className='text-xs text-muted-foreground'>
                {verdict.description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <CTASection
          title={t('cta.title')}
          description={t('cta.description')}
          primaryAction={{
            label: t('cta.primary'),
            href: '/workflow-templates',
          }}
          secondaryAction={{ label: t('cta.secondary'), href: '/pricing' }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
