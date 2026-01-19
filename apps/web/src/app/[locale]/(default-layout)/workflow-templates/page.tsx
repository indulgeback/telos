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
import { workflowTemplates, workflowCategories, difficultyLevels } from '@/data'
import {
  Zap,
  Puzzle,
  Sparkles,
  Database,
  MessageSquare,
  Clock,
  TrendingUp,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { cn } from '@/lib/utils'

export default function WorkflowsPage() {
  const t = useTranslations('WorkflowsPage')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap,
    Puzzle,
    Sparkles,
    Database,
    MessageSquare,
  }

  // Filter workflows
  const filteredWorkflows = workflowTemplates
    .filter(w => {
      if (selectedCategory !== 'all' && w.category !== selectedCategory)
        return false
      if (selectedDifficulty !== 'all' && w.difficulty !== selectedDifficulty)
        return false
      if (
        searchQuery &&
        !w.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !w.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !w.tags.some(tag =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => b.popularity - a.popularity)

  const getCategoryIcon = (categoryId: string) => {
    const category = workflowCategories.find(c => c.id === categoryId)
    return category?.icon ? iconMap[category.icon] || Sparkles : Sparkles
  }

  const getDifficultyColor = (difficulty: string) => {
    const level = difficultyLevels.find(l => l.id === difficulty)
    switch (level?.color) {
      case 'green':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'red':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
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
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedCategory('all')}
            >
              {t('categories.all')}
            </Button>
            {workflowCategories.slice(1).map(category => {
              const Icon = iconMap[category.icon] || Sparkles
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

          {/* Difficulty Filters */}
          <div className='flex items-center gap-4'>
            <span className='text-sm text-muted-foreground'>
              {t('difficulty.label')}:
            </span>
            <div className='flex gap-2'>
              {difficultyLevels.map(level => (
                <Button
                  key={level.id}
                  variant={
                    selectedDifficulty === level.id ? 'default' : 'outline'
                  }
                  size='sm'
                  onClick={() => setSelectedDifficulty(level.id)}
                >
                  {t(`difficulty.${level.id}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filteredWorkflows.map((workflow, index) => {
            const CategoryIcon = getCategoryIcon(workflow.category)
            return (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div className='group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all'>
                  {/* Header */}
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 rounded-lg bg-primary/10'>
                        <CategoryIcon className='h-5 w-5 text-primary' />
                      </div>
                      <div>
                        <h3 className='font-semibold text-foreground group-hover:text-primary transition-colors'>
                          {workflow.name}
                        </h3>
                      </div>
                    </div>
                    {workflow.popularity > 85 && (
                      <Badge variant='secondary' className='shrink-0'>
                        <TrendingUp className='h-3 w-3 mr-1' />
                        {t('popular')}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className='text-sm text-muted-foreground mb-4 line-clamp-2'>
                    {workflow.description}
                  </p>

                  {/* Tags */}
                  <div className='flex flex-wrap gap-1.5 mb-4'>
                    {workflow.tags.map(tag => (
                      <span
                        key={tag}
                        className='text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground'
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-3 text-muted-foreground'>
                      <span
                        className={cn(
                          'px-2 py-1 rounded',
                          getDifficultyColor(workflow.difficulty)
                        )}
                      >
                        {t(`difficulty.${workflow.difficulty}`)}
                      </span>
                      <span className='flex items-center gap-1'>
                        <Clock className='h-3.5 w-3.5' />
                        {workflow.estimatedTime}
                      </span>
                    </div>
                    <span className='text-muted-foreground'>
                      {workflow.steps} {workflow.steps === 1 ? 'step' : 'steps'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* No Results */}
        {filteredWorkflows.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>{t('noResults')}</p>
          </div>
        )}
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <CTASection
          title={t('cta.title')}
          description={t('cta.description')}
          primaryAction={{ label: t('cta.primary'), href: '/docs' }}
          secondaryAction={{ label: t('cta.secondary'), href: '/docs' }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
