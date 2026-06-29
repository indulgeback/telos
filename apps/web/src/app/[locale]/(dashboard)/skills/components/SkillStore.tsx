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
  // 全量系统技能(不受搜索/分类筛选影响),仅用于分类网格计数
  const [allSystemSkills, setAllSystemSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const listRef = useRef<HTMLDivElement>(null)

  // 搜索防抖，只同步更新 debouncedSearch 状态
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // 商店可见的技能:系统技能(owner_id 为 null)且未标记为 hidden
  // (skill-creator 等内置能力 metadata.hidden,不在商店展示)
  const isVisibleStoreSkill = (s: Skill) =>
    (s.owner_id === null || s.owner_id === undefined) &&
    !((s.metadata as { hidden?: boolean } | undefined)?.hidden === true)

  // 拉取全量系统技能一次,仅用于分类网格计数与「全部」总数。
  // 不随搜索/分类筛选变化,保证计数稳定(不受当前筛选结果影响)。
  useEffect(() => {
    let cancelled = false
    agentService
      .listSkills({})
      .then(data => {
        const systemOnly = data.filter(isVisibleStoreSkill)
        if (!cancelled) setAllSystemSkills(systemOnly)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // 拉取当前筛选(搜索 + 分类 + 排序)下的系统技能,用于列表渲染
  const loadStore = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentService.listSkills({
        search: debouncedSearch || undefined,
        category: category === 'all' ? undefined : category,
        sort,
      })
      // 商店只展示系统技能(owner_id 为 null)且非 hidden 的(排除内置能力)
      const systemOnly = data.filter(isVisibleStoreSkill)
      setStoreSkills(systemOnly)
    } catch {
      setStoreSkills([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, sort])

  useEffect(() => {
    loadStore()
  }, [loadStore])

  // 各分类的技能计数(基于全量系统技能,不受当前筛选影响)
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of allSystemSkills) {
      const cat =
        (s.metadata as { category?: string } | undefined)?.category ?? 'other'
      map[cat] = (map[cat] ?? 0) + 1
    }
    return map
  }, [allSystemSkills])

  // 分类网格 ↔ chips 双向同步:网格选中即更新 category 状态。
  // 不再做 scrollIntoView —— 网格与列表距离很近,强制滚动反而造成抖动;
  // 选中分类后用户视线自然落到下方列表。
  const handleCategorySelect = (cat: string | undefined) => {
    setCategory((cat as Category) ?? 'all')
  }

  const handleExplore = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className='space-y-10'>
      {/* 主视觉横幅:总数用全量系统技能,不受筛选影响 */}
      <SkillHeroBanner
        totalCount={allSystemSkills.length}
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

        {/* 商店内容:加载时保留旧卡片(仅降低不透明度 + 显示遮罩 spinner),
            避免高度从网格塌缩成 spinner 再撑开造成的抖动 */}
        {storeSkills.length === 0 && loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='size-8 animate-spin text-muted-foreground' />
          </div>
        ) : storeSkills.length === 0 ? (
          <div className='py-12 text-center text-sm text-muted-foreground'>
            {t('store.empty')}
          </div>
        ) : (
          <div className='relative'>
            {/* 加载遮罩:叠在旧卡片上,保持布局高度不变 */}
            {loading && (
              <div className='absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]'>
                <Loader2 className='size-7 animate-spin text-muted-foreground' />
              </div>
            )}
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
          </div>
        )}
      </div>
    </div>
  )
}
