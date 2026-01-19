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
import { showcaseStories, showcaseIndustries } from '@/data/showcase'
import { testimonials } from '@/data/testimonials'
import {
  Search,
  Building2,
  TrendingUp,
  Clock,
  ChevronRight,
  Star,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export default function ShowcasePage() {
  const t = useTranslations('ShowcasePage')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStory, setSelectedStory] = useState<string | null>(null)

  // Filter showcase stories
  const filteredStories = showcaseStories.filter(story => {
    if (selectedIndustry !== 'all' && story.industry !== selectedIndustry)
      return false
    if (
      searchQuery &&
      !story.company.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !story.headline.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !story.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) {
      return false
    }
    return true
  })

  const selectedStoryData = selectedStory
    ? showcaseStories.find(s => s.id === selectedStory)
    : null

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
            <Star className='h-4 w-4 fill-current' />
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
            className='text-xl text-muted-foreground max-w-2xl mx-auto'
          >
            {t('hero.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Stats Bar */}
      <SectionWrapper>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6 py-8 px-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20'>
          {[
            { value: '500+', label: t('stats.companies') },
            { value: '99.9%', label: t('stats.satisfaction') },
            { value: '3M+', label: t('stats.workflows') },
            { value: '18', label: t('stats.industries') },
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

          {/* Industry Filters */}
          <div className='flex flex-wrap gap-2'>
            {showcaseIndustries.map(industry => (
              <Button
                key={industry.id}
                variant={
                  selectedIndustry === industry.id ? 'default' : 'outline'
                }
                size='sm'
                onClick={() => setSelectedIndustry(industry.id)}
              >
                {industry.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Stories Grid */}
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filteredStories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className='group'
            >
              <div
                className='h-full p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer'
                onClick={() => setSelectedStory(story.id)}
              >
                {/* Header */}
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-2 rounded-lg bg-primary/10'>
                    <Building2 className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <Badge variant='outline' className='mb-1'>
                      {story.industry}
                    </Badge>
                    <h3 className='font-semibold text-foreground group-hover:text-primary transition-colors'>
                      {story.company}
                    </h3>
                  </div>
                </div>

                {/* Headline */}
                <h4 className='text-lg font-medium text-foreground mb-3 line-clamp-2'>
                  {story.headline}
                </h4>

                {/* Preview */}
                <p className='text-sm text-muted-foreground mb-4 line-clamp-3'>
                  {story.story}
                </p>

                {/* Key Result */}
                {story.results[0] && (
                  <div className='flex items-center gap-2 text-sm font-medium text-primary mb-4'>
                    <TrendingUp className='h-4 w-4' />
                    {story.results[0].value} {story.results[0].description}
                  </div>
                )}

                {/* Tags */}
                <div className='flex flex-wrap gap-1.5 mb-4'>
                  {story.tags.slice(0, 3).map(tag => (
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
                  <span className='flex items-center gap-1 text-muted-foreground'>
                    <Clock className='h-3.5 w-3.5' />
                    {story.readTime} read
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
        {filteredStories.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>{t('noResults')}</p>
          </div>
        )}
      </SectionWrapper>

      {/* Story Detail Modal */}
      {selectedStoryData && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
          onClick={() => setSelectedStory(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className='w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-2xl border border-border'
          >
            {/* Header */}
            <div className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between'>
              <div>
                <Badge variant='outline' className='mb-2'>
                  {selectedStoryData.industry}
                </Badge>
                <h2 className='text-2xl font-bold text-foreground'>
                  {selectedStoryData.company}
                </h2>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelectedStory(null)}
              >
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className='p-6 space-y-8'>
              {/* Headline */}
              <div>
                <h3 className='text-2xl font-bold text-foreground mb-4'>
                  {selectedStoryData.headline}
                </h3>
                <p className='text-muted-foreground leading-relaxed'>
                  {selectedStoryData.story}
                </p>
              </div>

              {/* Results Grid */}
              <div>
                <h4 className='font-semibold text-foreground mb-4 flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5 text-primary' />
                  {t('detail.results')}
                </h4>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  {selectedStoryData.results.map((result, i) => (
                    <div
                      key={i}
                      className='p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20'
                    >
                      <div className='text-2xl font-bold text-primary'>
                        {result.value}
                      </div>
                      <div className='text-sm text-muted-foreground mt-1'>
                        {result.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenges */}
              <div>
                <h4 className='font-semibold text-foreground mb-4 flex items-center gap-2'>
                  <Sparkles className='h-5 w-5 text-orange-500' />
                  {t('detail.challenges')}
                </h4>
                <ul className='space-y-2'>
                  {selectedStoryData.challenges.map((challenge, i) => (
                    <li
                      key={i}
                      className='flex items-start gap-3 text-muted-foreground'
                    >
                      <span className='text-orange-500 mt-0.5'>✗</span>
                      {challenge}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solutions */}
              <div>
                <h4 className='font-semibold text-foreground mb-4 flex items-center gap-2'>
                  <Check className='h-5 w-5 text-green-500' />
                  {t('detail.solutions')}
                </h4>
                <ul className='space-y-2'>
                  {selectedStoryData.solutions.map((solution, i) => (
                    <li
                      key={i}
                      className='flex items-start gap-3 text-muted-foreground'
                    >
                      <Check className='h-5 w-5 text-green-500 shrink-0 mt-0.5' />
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Testimonial */}
              <div className='p-6 rounded-xl bg-muted/50 border border-border'>
                <div className='flex items-start gap-4'>
                  <div className='relative w-16 h-16 rounded-full overflow-hidden shrink-0'>
                    <Image
                      src={`/assets/images/images/avatar/${selectedStoryData.testimonial.avatar}`}
                      alt={selectedStoryData.testimonial.author}
                      fill
                      sizes='64px'
                      className='object-cover'
                    />
                  </div>
                  <div>
                    <p className='text-foreground italic mb-3'>
                      "{selectedStoryData.testimonial.quote}"
                    </p>
                    <div>
                      <div className='font-semibold text-foreground'>
                        {selectedStoryData.testimonial.author}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {selectedStoryData.testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className='flex flex-wrap gap-2'>
                {selectedStoryData.tags.map(tag => (
                  <Badge key={tag} variant='secondary'>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Testimonials Preview */}
      <SectionWrapper>
        <SectionTitle
          title={t('testimonials.title')}
          description={t('testimonials.description')}
          variant='center'
        />
        <div className='grid md:grid-cols-3 gap-6'>
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className='p-6 rounded-xl bg-card border border-border'
            >
              <div className='flex items-center gap-1 mb-4'>
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star
                    key={i}
                    className='h-4 w-4 fill-yellow-400 text-yellow-400'
                  />
                ))}
              </div>
              <p className='text-muted-foreground mb-4 line-clamp-3'>
                "{testimonial.quote}"
              </p>
              <div className='flex items-center gap-3'>
                <div className='relative w-10 h-10 rounded-full overflow-hidden'>
                  <Image
                    src={`/assets/images/images/avatar/${testimonial.avatar}`}
                    alt={testimonial.name}
                    fill
                    sizes='40px'
                    className='object-cover'
                  />
                </div>
                <div>
                  <div className='font-medium text-foreground text-sm'>
                    {testimonial.name}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
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
          secondaryAction={{
            label: t('cta.secondary'),
            href: '/workflow-templates',
          }}
          variant='gradient'
        />
      </SectionWrapper>
    </main>
  )
}
