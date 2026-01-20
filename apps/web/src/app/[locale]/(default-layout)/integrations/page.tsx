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
import { integrations, integrationCategories } from '@/data'
import {
  Search,
  Clock,
  Star,
  Sparkles,
  MessageSquare,
  Code2,
  Database,
  LayoutGrid,
  Users,
  MoreHorizontal,
  Gamepad2,
  Mail,
  Github,
  GitBranch,
  ArrowRight,
  FileText,
  Table2,
  CheckCircle2,
  Bot,
  Cpu,
  Contact,
  CreditCard,
  Phone,
  Cloud,
  Globe,
  HardDrive,
  Send,
  Trello,
  DatabaseZap,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { cn } from '@/lib/utils'

export default function IntegrationsPage() {
  const t = useTranslations('IntegrationsPage')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    MessageSquare,
    Gamepad2,
    Send,
    Mail,
    Github,
    GitBranch,
    ArrowRight,
    FileText,
    Table2,
    CheckCircle2,
    Bot,
    Cpu,
    Contact,
    CreditCard,
    Phone,
    Cloud,
    Globe,
    HardDrive,
    DatabaseZap,
    Trello,
  }

  // Category icon mapping
  const categoryIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    MessageSquare,
    Code2,
    Database,
    LayoutGrid,
    Sparkles,
    Users,
    MoreHorizontal,
  }

  // Filter integrations
  const filteredIntegrations = integrations
    .filter(integration => {
      if (selectedCategory === 'popular') return integration.popular
      if (
        selectedCategory !== 'all' &&
        integration.category !== selectedCategory
      )
        return false
      if (
        searchQuery &&
        !integration.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !integration.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !integration.features.some(f =>
          f.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Popular first, then by name
      if (a.popular && !b.popular) return -1
      if (!a.popular && b.popular) return 1
      return a.name.localeCompare(b.name)
    })

  const getIntegrationIcon = (logo?: string) => {
    if (!logo) return Sparkles
    if (!iconMap[logo]) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Icon "${logo}" not found in iconMap, using Sparkles fallback`
        )
      }
      return Sparkles
    }
    return iconMap[logo]
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = integrationCategories.find(c => c.id === categoryId)
    if (!category?.icon) return MoreHorizontal
    if (!categoryIconMap[category.icon]) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Category icon "${category.icon}" not found, using MoreHorizontal fallback`
        )
      }
      return MoreHorizontal
    }
    return categoryIconMap[category.icon]
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

      {/* Search and Filters */}
      <SectionWrapper variant='card'>
        <div className='mb-8 space-y-4'>
          {/* Search Bar */}
          <div className='relative'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
            <input
              type='text'
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full pl-12 pr-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>

          {/* Category Filters */}
          <div className='flex flex-wrap gap-2'>
            {integrationCategories.map(category => {
              const Icon = getCategoryIcon(category.id)
              return (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? 'default' : 'outline'
                  }
                  size='sm'
                  onClick={() => setSelectedCategory(category.id)}
                  className='gap-1.5'
                >
                  <Icon className='h-4 w-4' />
                  {t(`categories.${category.id}`)}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Integration Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filteredIntegrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.03 }}
            >
              <div className='group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer'>
                {/* Header */}
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2.5 rounded-lg bg-primary/10'>
                      {(() => {
                        const Icon = getIntegrationIcon(integration.logo)
                        return <Icon className='h-6 w-6 text-primary' />
                      })()}
                    </div>
                    <div>
                      <h3 className='font-semibold text-foreground group-hover:text-primary transition-colors'>
                        {integration.name}
                      </h3>
                      {integration.beta && (
                        <Badge variant='secondary' className='mt-1 text-xs'>
                          Beta
                        </Badge>
                      )}
                    </div>
                  </div>
                  {integration.popular && (
                    <Star className='h-4 w-4 text-yellow-500 fill-yellow-500' />
                  )}
                </div>

                {/* Description */}
                <p className='text-sm text-muted-foreground mb-4 line-clamp-2'>
                  {integration.description}
                </p>

                {/* Features */}
                <div className='flex flex-wrap gap-1.5 mb-4'>
                  {integration.features.slice(0, 3).map(feature => (
                    <span
                      key={feature}
                      className='text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground'
                    >
                      {feature}
                    </span>
                  ))}
                  {integration.features.length > 3 && (
                    <span className='text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground'>
                      +{integration.features.length - 3}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className='flex items-center justify-between text-sm'>
                  <span className='flex items-center gap-1 text-muted-foreground'>
                    <Clock className='h-3.5 w-3.5' />
                    {integration.setupTime}
                  </span>
                  <span className='text-primary group-hover:translate-x-1 transition-transform'>
                    <ArrowRight className='h-4 w-4' />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* No Results */}
        {filteredIntegrations.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>{t('noResults')}</p>
          </div>
        )}
      </SectionWrapper>

      {/* Stats Section */}
      <SectionWrapper>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-8 text-center'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className='text-4xl font-bold text-primary mb-2'>100+</div>
            <div className='text-sm text-muted-foreground'>
              {t('stats.integrations')}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className='text-4xl font-bold text-primary mb-2'>8</div>
            <div className='text-sm text-muted-foreground'>
              {t('stats.categories')}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className='text-4xl font-bold text-primary mb-2'>99.9%</div>
            <div className='text-sm text-muted-foreground'>
              {t('stats.uptime')}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className='text-4xl font-bold text-primary mb-2'>5min</div>
            <div className='text-sm text-muted-foreground'>
              {t('stats.avgSetup')}
            </div>
          </motion.div>
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
          secondaryAction={{ label: t('cta.secondary'), href: '/docs' }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
