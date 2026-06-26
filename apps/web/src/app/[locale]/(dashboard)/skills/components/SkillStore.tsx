'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms'
import { agentService, type Skill } from '@/service/agent'
import { StoreSkillCard } from './StoreSkillCard'
import { SkillHeroBanner } from './SkillHeroBanner'
import { CategoryGrid } from './CategoryGrid'
import { Search, Loader2 } from 'lucide-react'

interface SkillStoreProps {
  /** 用户已安装的技能名集合(决定卡片显示 安装/已安装) */
  installedNames: Set<string>
  /** 安装成功后的回调(父组件刷新已安装列表) */
  onInstalled: () => void
}

// 分类状态:'all' = 不筛选,其余对应 metadata.category
type Category = 'all' | 'writing' | 'coding' | 'productivity' | 'data'

export function SkillStore({ installedNames, onInstalled }: SkillStoreProps) {
  const t = useTranslations('Skill')
  const [storeSkills, setStoreSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const listRef = useRef<HTMLDivElement>(null)

  const loadStore = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentService.listSkills({
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        sort,
      })
      // 商店只展示系统技能(owner_id 为 null)
      const systemOnly = data.filter(
        s => s.owner_id === null || s.owner_id === undefined
      )
      setStoreSkills(systemOnly)
    } catch {
      setStoreSkills([])
    } finally {
      setLoading(false)
    }
  }, [search, category, sort])

  useEffect(() => {
    loadStore()
  }, [loadStore])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => loadStore(), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // 各分类的技能计数(基于已加载的商店数据本地聚合)
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of storeSkills) {
      const cat =
        (s.metadata as { category?: string } | undefined)?.category ?? 'other'
      map[cat] = (map[cat] ?? 0) + 1
    }
    return map
  }, [storeSkills])

  // 分类网格 ↔ chips 双向同步:网格选中即更新 category 状态
  const handleCategorySelect = (cat: string | undefined) => {
    setCategory((cat as Category) ?? 'all')
    // 滚动到列表区,避免选中后仍停留在网格位置
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleExplore = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className='space-y-10'>
      {/* 主视觉横幅 */}
      <SkillHeroBanner
        totalCount={storeSkills.length}
        onExplore={handleExplore}
      />

      {/* 分类网格 */}
      <CategoryGrid
        counts={categoryCounts}
        active={category === 'all' ? undefined : category}
        onSelect={handleCategorySelect}
      />

      {/* 搜索 + 排序 + 列表 */}
      <div ref={listRef} className='space-y-6 scroll-mt-6'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative w-full max-w-sm'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder={t('store.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='pl-9'
            />
          </div>

          {/* 排序 */}
          <Select
            value={sort}
            onValueChange={v => setSort(v as 'recent' | 'name')}
          >
            <SelectTrigger className='h-9 w-[130px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='recent'>{t('store.sortRecent')}</SelectItem>
              <SelectItem value='name'>{t('store.sortName')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 商店内容 */}
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='size-8 animate-spin text-muted-foreground' />
          </div>
        ) : storeSkills.length === 0 ? (
          <div className='py-12 text-center text-sm text-muted-foreground'>
            {t('store.empty')}
          </div>
        ) : (
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {storeSkills.map(skill => (
              <StoreSkillCard
                key={skill.id}
                skill={skill}
                installed={installedNames.has(skill.name)}
                onInstalled={onInstalled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
