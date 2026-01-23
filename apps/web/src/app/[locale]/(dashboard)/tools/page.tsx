'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atoms'
import { toolService, type Tool } from '@/service/tool'
import { CreateToolModal } from './components/CreateToolModal'
import { ToolCard } from './components/ToolCard'
import { Plus, Wrench } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/atoms'
import { Badge } from '@/components/atoms'

export default function ToolsPage() {
  const t = useTranslations('Tool')
  const [tools, setTools] = useState<Tool[]>([])
  const [filteredTools, setFilteredTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // 工具分类
  const categories = [
    { value: null, label: t('allCategories') },
    { value: 'web', label: t('categories.web') },
    { value: 'api', label: t('categories.api') },
    { value: 'database', label: t('categories.database') },
    { value: 'custom', label: t('categories.custom') },
    { value: 'test', label: t('categories.test') },
  ]

  const loadTools = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await toolService.listTools()
      setTools(data.tools)
      setFilteredTools(data.tools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTools()
  }, [])

  // 过滤工具
  useEffect(() => {
    let filtered = tools

    // 按分类过滤
    if (selectedCategory) {
      filtered = filtered.filter(tool => tool.category === selectedCategory)
    }

    // 按搜索关键词过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        tool =>
          tool.name.toLowerCase().includes(query) ||
          tool.display_name.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query)
      )
    }

    setFilteredTools(filtered)
  }, [tools, searchQuery, selectedCategory])

  return (
    <div className='container mx-auto py-8'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10'>
            <Wrench className='size-5 text-primary' />
          </div>
          <div>
            <h1 className='text-3xl font-bold'>{t('title')}</h1>
            <p className='text-muted-foreground'>{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className='mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4'>
          <p className='text-sm text-destructive'>{error}</p>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-1 items-center gap-3'>
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='max-w-xs'
          />
          <div className='flex gap-2'>
            {categories.map(cat => (
              <Button
                key={cat.value ?? 'all'}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size='sm'
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className='gap-2'>
          <Plus className='size-4' />
          {t('create')}
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <>
          {/* Empty State */}
          {filteredTools.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='mb-4 flex size-20 items-center justify-center rounded-full bg-muted'>
                <Wrench className='size-10 text-muted-foreground' />
              </div>
              <h3 className='mb-2 text-lg font-semibold'>
                {searchQuery || selectedCategory
                  ? t('empty.noResults')
                  : t('empty.title')}
              </h3>
              <p className='mb-6 text-sm text-muted-foreground'>
                {searchQuery || selectedCategory
                  ? t('empty.tryDifferentFilter')
                  : t('empty.description')}
              </p>
              {!searchQuery && !selectedCategory && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className='gap-2'
                >
                  <Plus className='size-4' />
                  {t('create')}
                </Button>
              )}
            </div>
          ) : (
            /* Tools Grid */
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {filteredTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} onUpdate={loadTools} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Tool Modal */}
      {showCreateModal && (
        <CreateToolModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadTools()
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
