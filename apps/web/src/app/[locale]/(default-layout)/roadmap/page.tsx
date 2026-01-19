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
import {
  roadmapItems,
  roadmapQuarters,
  roadmapCategories,
  statusConfig,
} from '@/data/roadmap'
import {
  Search,
  Sparkles,
  Puzzle,
  GitBranch,
  Layers,
  Shield,
  Zap,
  Grid3x3,
  CheckCircle,
  Clock,
  Calendar,
  Flame,
  ChevronRight,
  ThumbsUp,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { cn } from '@/lib/utils'

export default function RoadmapPage() {
  const t = useTranslations('RoadmapPage')
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Icon mapping
  const categoryIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    Sparkles,
    Puzzle,
    GitBranch,
    Layers,
    Shield,
    Zap,
  }

  const statusIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    CheckCircle,
    Clock,
    Calendar,
    Flame,
  }

  // Filter roadmap items
  const filteredItems = roadmapItems
    .filter(item => {
      if (selectedQuarter !== 'all' && item.quarter !== selectedQuarter)
        return false
      if (selectedCategory !== 'all' && item.category !== selectedCategory)
        return false
      if (selectedStatus !== 'all' && item.status !== selectedStatus)
        return false
      if (
        searchQuery &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.features.some(f =>
          f.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Sort by quarter, then by votes
      const quarterOrder = [
        'Q4 2024',
        'Q1 2025',
        'Q2 2025',
        'Q3 2025',
        'Q4 2025',
      ]
      const aIndex = quarterOrder.indexOf(a.quarter)
      const bIndex = quarterOrder.indexOf(b.quarter)
      if (aIndex !== bIndex) return aIndex - bIndex
      return b.votes - a.votes
    })

  const handleVote = (itemId: string) => {
    setVotedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const getStatusConfig = (status: string) => {
    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.planned
    )
  }

  // Group items by quarter
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.quarter]) {
        acc[item.quarter] = []
      }
      acc[item.quarter].push(item)
      return acc
    },
    {} as Record<string, typeof roadmapItems>
  )

  return (
    <main className='pt-20'>
      {/* Hero */}
      <section className='relative py-20 px-4 overflow-hidden'>
        <GradientBlob color='primary' size='lg' position='top-right' />
        <div className='max-w-4xl mx-auto text-center relative z-10'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6'
          >
            <Flame className='h-4 w-4' />
            {t('hero.badge')}
          </motion.div>
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

          <div className='flex flex-col lg:flex-row gap-4'>
            {/* Quarter Filters */}
            <div className='flex-1'>
              <span className='text-sm text-muted-foreground block mb-2'>
                {t('filters.quarter')}:
              </span>
              <div className='flex flex-wrap gap-2'>
                {roadmapQuarters.map(quarter => (
                  <Button
                    key={quarter.id}
                    variant={
                      selectedQuarter === quarter.id ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => setSelectedQuarter(quarter.id)}
                  >
                    {quarter.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Filters */}
            <div className='flex-1'>
              <span className='text-sm text-muted-foreground block mb-2'>
                {t('filters.category')}:
              </span>
              <div className='flex flex-wrap gap-2'>
                {roadmapCategories.map(category => {
                  const Icon = categoryIconMap[category.icon] || Grid3x3
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
                      {category.icon !== 'Grid3x3' && (
                        <Icon className='h-4 w-4' />
                      )}
                      {category.name}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Status Filters */}
            <div className='flex-1'>
              <span className='text-sm text-muted-foreground block mb-2'>
                {t('filters.status')}:
              </span>
              <div className='flex flex-wrap gap-2'>
                {Object.entries(statusConfig).map(([key, config]) => {
                  const Icon = statusIconMap[config.icon]
                  return (
                    <Button
                      key={key}
                      variant={selectedStatus === key ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setSelectedStatus(key)}
                      className='gap-1.5'
                    >
                      <Icon className='h-4 w-4' />
                      {config.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Timeline */}
        <div className='space-y-12'>
          {Object.entries(groupedItems).map(([quarter, items], groupIndex) => (
            <div key={quarter}>
              {/* Quarter Header */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
                className='flex items-center gap-4 mb-6'
              >
                <div className='flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold'>
                  {quarter.split(' ')[0].replace('Q', '')}
                </div>
                <h3 className='text-2xl font-bold text-foreground'>
                  {quarter}
                </h3>
                <div className='flex-1 h-px bg-border' />
              </motion.div>

              {/* Items */}
              <div className='grid md:grid-cols-2 gap-4 ml-6'>
                {items.map((item, index) => {
                  const statusCfg = getStatusConfig(item.status)
                  const StatusIcon = statusIconMap[statusCfg.icon]
                  const isExpanded = expandedItems.has(item.id)
                  const hasVoted = votedItems.has(item.id)

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <div
                        className={cn(
                          'p-5 rounded-xl border transition-all cursor-pointer',
                          item.status === 'completed' &&
                            'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20',
                          item.status === 'in-progress' &&
                            'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20',
                          item.status === 'planned' && 'border-border bg-card',
                          item.status === 'beta' &&
                            'border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20'
                        )}
                        onClick={() => toggleExpand(item.id)}
                      >
                        {/* Header */}
                        <div className='flex items-start justify-between gap-3 mb-3'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={cn(
                                'px-2 py-1 rounded text-xs font-medium',
                                statusCfg.color
                              )}
                            >
                              <StatusIcon className='h-3 w-3 inline mr-1' />
                              {statusCfg.label}
                            </span>
                            <Badge variant='outline' className='text-xs'>
                              {roadmapCategories.find(
                                c => c.id === item.category
                              )?.name || item.category}
                            </Badge>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </div>

                        {/* Title & Description */}
                        <h4 className='font-semibold text-foreground mb-2'>
                          {item.title}
                        </h4>
                        <p className='text-sm text-muted-foreground mb-3 line-clamp-2'>
                          {item.description}
                        </p>

                        {/* Expanded Features */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className='mb-4 pt-3 border-t border-border'
                          >
                            <ul className='space-y-1.5'>
                              {item.features.map((feature, i) => (
                                <li
                                  key={i}
                                  className='text-sm text-muted-foreground flex items-center gap-2'
                                >
                                  <CheckCircle className='h-3.5 w-3.5 text-primary shrink-0' />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}

                        {/* Footer */}
                        <div className='flex items-center justify-between'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className={cn(
                              'gap-1.5 text-xs',
                              hasVoted && 'text-primary'
                            )}
                            onClick={e => {
                              e.stopPropagation()
                              handleVote(item.id)
                            }}
                          >
                            <ThumbsUp
                              className={cn(
                                'h-3.5 w-3.5',
                                hasVoted && 'fill-current'
                              )}
                            />
                            {item.votes + (hasVoted ? 1 : 0)}
                          </Button>
                          <span className='text-xs text-muted-foreground'>
                            {isExpanded
                              ? 'Click to collapse'
                              : 'Click to expand'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredItems.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>{t('noResults')}</p>
          </div>
        )}
      </SectionWrapper>

      {/* Stats Section */}
      <SectionWrapper>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6 py-8 px-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20'>
          {[
            { value: '5', label: t('stats.quarters') },
            { value: '15+', label: t('stats.features') },
            { value: '3', label: t('stats.completed') },
            { value: '6', label: t('stats.categories') },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className='text-center'
            >
              <div className='text-2xl md:text-3xl font-bold text-primary'>
                {stat.value}
              </div>
              <div className='text-sm text-muted-foreground mt-1'>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <CTASection
          title={t('cta.title')}
          description={t('cta.description')}
          primaryAction={{ label: t('cta.primary'), href: '/contact' }}
          secondaryAction={{ label: t('cta.secondary'), href: '/docs' }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
