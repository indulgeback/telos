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
  useCases,
  useCaseIndustries,
  useCaseCategories,
} from '@/data/use-cases'
import {
  Search,
  Clock,
  TrendingUp,
  Grid3x3,
  Zap,
  Puzzle,
  Sparkles,
  Database,
  GitBranch,
  Users,
  TrendingDown,
  DollarSign,
  Headphones,
  ShoppingCart,
  Server,
  Settings,
  Kanban,
  Package,
  FileText,
  UserPlus,
  Calendar,
  AlertTriangle,
  BarChart,
  Receipt,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { cn } from '@/lib/utils'

export default function UseCasesPage() {
  const t = useTranslations('UseCasesPage')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCase, setExpandedCase] = useState<string | null>(null)

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Users,
    TrendingUp,
    MessageSquare: Headphones,
    DollarSign,
    Package,
    AlertTriangle,
    Server,
    FileText,
    Calendar,
    BarChart,
    Database,
    Receipt,
    GitBranch,
  }

  const categoryIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    Zap,
    Puzzle,
    Sparkles,
    Database,
    GitBranch,
  }

  const industryIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    Grid3x3,
    TrendingUp,
    Headphones,
    DollarSign,
    Users,
    ShoppingCart,
    Server,
    Settings,
    Kanban,
    Database,
  }

  // Filter use cases
  const filteredUseCases = useCases.filter(useCase => {
    if (selectedIndustry !== 'all' && useCase.industry !== selectedIndustry)
      return false
    if (selectedCategory !== 'all' && useCase.category !== selectedCategory)
      return false
    if (
      searchQuery &&
      !useCase.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !useCase.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !useCase.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) {
      return false
    }
    return true
  })

  const getUseCaseIcon = (icon: string) => {
    return iconMap[icon] || Zap
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = useCaseCategories.find(c => c.id === categoryId)
    return category?.icon ? categoryIconMap[category.icon] : Zap
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'advanced':
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

          <div className='flex flex-col md:flex-row gap-4'>
            {/* Industry Filters */}
            <div className='flex-1'>
              <span className='text-sm text-muted-foreground block mb-2'>
                {t('filters.industry')}:
              </span>
              <div className='flex flex-wrap gap-2'>
                {useCaseIndustries.map(industry => {
                  const Icon = industryIconMap[industry.icon] || Grid3x3
                  return (
                    <Button
                      key={industry.id}
                      variant={
                        selectedIndustry === industry.id ? 'default' : 'outline'
                      }
                      size='sm'
                      onClick={() => setSelectedIndustry(industry.id)}
                      className='gap-1.5'
                    >
                      <Icon className='h-4 w-4' />
                      {industry.name}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Category Filters */}
            <div className='flex-1'>
              <span className='text-sm text-muted-foreground block mb-2'>
                {t('filters.category')}:
              </span>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedCategory('all')}
                >
                  {t('categories.all')}
                </Button>
                {useCaseCategories.map(category => {
                  const Icon = categoryIconMap[category.icon]
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
          </div>
        </div>

        {/* Use Cases List */}
        <div className='space-y-4'>
          {filteredUseCases.map((useCase, index) => {
            const isExpanded = expandedCase === useCase.id
            const Icon = getUseCaseIcon(useCase.icon)
            const CategoryIcon = getCategoryIcon(useCase.category)

            return (
              <motion.div
                key={useCase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div className='group border border-border rounded-xl bg-card hover:border-primary/50 transition-all overflow-hidden'>
                  {/* Main Card - Always Visible */}
                  <div
                    className='p-6 cursor-pointer'
                    onClick={() =>
                      setExpandedCase(isExpanded ? null : useCase.id)
                    }
                  >
                    <div className='flex items-start gap-4'>
                      {/* Icon */}
                      <div className='p-3 rounded-lg bg-primary/10 shrink-0'>
                        <Icon className='h-6 w-6 text-primary' />
                      </div>

                      {/* Content */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-4 mb-2'>
                          <div>
                            <h3 className='font-semibold text-foreground group-hover:text-primary transition-colors mb-1'>
                              {useCase.name}
                            </h3>
                            <p className='text-sm text-muted-foreground line-clamp-2'>
                              {useCase.description}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-5 w-5 text-muted-foreground transition-transform shrink-0',
                              isExpanded && 'rotate-90'
                            )}
                          />
                        </div>

                        {/* Tags & Meta */}
                        <div className='flex flex-wrap items-center gap-2 mt-3'>
                          <Badge variant='outline' className='text-xs'>
                            {useCase.industry}
                          </Badge>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              getDifficultyColor(useCase.difficulty)
                            )}
                          >
                            {t(`difficulty.${useCase.difficulty}`)}
                          </span>
                          <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                            <TrendingDown className='h-3 w-3 text-[#34A853]' />
                            {useCase.timeSaved}
                          </span>
                          {useCase.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className='text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground'
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='border-t border-border bg-muted/30 px-6 py-4'
                    >
                      <div className='grid md:grid-cols-2 gap-6'>
                        {/* Benefits */}
                        <div>
                          <h4 className='font-semibold text-foreground mb-3 flex items-center gap-2'>
                            <CheckCircle2 className='h-4 w-4 text-[#34A853]' />
                            {t('details.benefits')}
                          </h4>
                          <ul className='space-y-2'>
                            {useCase.benefits.map((benefit, i) => (
                              <li
                                key={i}
                                className='text-sm text-muted-foreground flex items-start gap-2'
                              >
                                <span className='text-primary mt-0.5'>•</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Tools */}
                        <div>
                          <h4 className='font-semibold text-foreground mb-3 flex items-center gap-2'>
                            <CategoryIcon className='h-4 w-4 text-primary' />
                            {t('details.tools')}
                          </h4>
                          <div className='flex flex-wrap gap-2'>
                            {useCase.tools.map(tool => (
                              <span
                                key={tool}
                                className='text-sm px-3 py-1.5 rounded-lg bg-background border border-border'
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* No Results */}
        {filteredUseCases.length === 0 && (
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
          primaryAction={{
            label: t('cta.primary'),
            href: '/workflow-templates',
          }}
          secondaryAction={{ label: t('cta.secondary'), href: '/contact' }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
