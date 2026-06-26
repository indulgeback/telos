'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/atoms'
import { agentService, type Skill } from '@/service/agent'
import { SkillEditModal } from './components/SkillEditModal'
import { SkillCard } from './components/SkillCard'
import { SkillStore } from './components/SkillStore'
import { Plus, Wand2, Loader2 } from 'lucide-react'

export default function SkillsPage() {
  const t = useTranslations('Skill')
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState('store')
  const [error, setError] = useState<string | null>(null)

  const loadSkills = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const data = await agentService.listSkills()
      setSkills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadSkills()
  }, [])

  // 我的技能 = owner_id 非 null(用户创建或从商店安装的)
  const mySkills = useMemo(
    () => skills.filter(s => s.owner_id !== null && s.owner_id !== undefined),
    [skills]
  )
  // 已安装的技能名集合(用于商店卡片显示「已安装」状态)
  const installedNames = useMemo(
    () => new Set(mySkills.map(s => s.name)),
    [mySkills]
  )

  return (
    <div className='container mx-auto py-8'>
      {/* Error State */}
      {error && (
        <div className='mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4'>
          <p className='text-sm text-destructive'>{error}</p>
        </div>
      )}

      {/* Tabs: 默认 Store, 可切换 My Skills。标题与场景切换/创建控件并到一行 */}
      <Tabs defaultValue='store' onValueChange={v => setActiveTab(v)}>
        <div className='mb-8 flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <h1 className='text-3xl font-bold'>{t('title')}</h1>
            <TabsList>
              <TabsTrigger value='store'>{t('store.tabStore')}</TabsTrigger>
              <TabsTrigger value='mine'>{t('store.tabMine')}</TabsTrigger>
            </TabsList>
          </div>
          {/* Create 按钮仅在「我的技能」tab 下显示 */}
          {activeTab === 'mine' && (
            <Button onClick={() => setShowCreateModal(true)} className='gap-2'>
              <Plus className='size-4' />
              {t('create')}
            </Button>
          )}
        </div>

        {/* Store Tab */}
        <TabsContent value='store'>
          <SkillStore
            installedNames={installedNames}
            onInstalled={() => loadSkills(true)}
          />
        </TabsContent>

        {/* My Skills Tab */}
        <TabsContent value='mine'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='size-8 animate-spin text-muted-foreground' />
            </div>
          ) : mySkills.length === 0 ? (
            /* Empty State */
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='mb-4 flex size-20 items-center justify-center rounded-full bg-muted'>
                <Wand2 className='size-10 text-muted-foreground' />
              </div>
              <h3 className='mb-2 text-lg font-semibold'>{t('empty.title')}</h3>
              <p className='mb-6 text-sm text-muted-foreground'>
                {t('empty.description')}
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className='gap-2'
              >
                <Plus className='size-4' />
                {t('create')}
              </Button>
            </div>
          ) : (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {mySkills.map(skill => (
                <SkillCard key={skill.id} skill={skill} onUpdate={loadSkills} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Skill Modal */}
      {showCreateModal && (
        <SkillEditModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadSkills()
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
