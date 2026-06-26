'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms'
import { Button } from '@/components/atoms'
import { Badge } from '@/components/atoms'
import { Loader2, Check, Search, Wand2, Lock } from 'lucide-react'
import { Input } from '@/components/atoms'
import { agentService, type Skill, type AgentSkill } from '@/service/agent'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ConfigureSkillsModalProps {
  agentId: string
  agentName: string
  onClose: () => void
  onSuccess: () => void
}

export function ConfigureSkillsModal({
  agentId,
  agentName,
  onClose,
  onSuccess,
}: ConfigureSkillsModalProps) {
  const t = useTranslations('Skill')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(
    new Set()
  )

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const skillsData = await agentService.listSkills()
      setAvailableSkills(skillsData)

      const agentSkillsData = await agentService.getAgentSkills(agentId)
      setAgentSkills(agentSkillsData.skills)

      const enabledIds = new Set(
        agentSkillsData.skills.filter(s => s.enabled).map(s => s.skill_id)
      )
      setSelectedSkillIds(enabledIds)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load skills'
      )
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    loadData()
  }, [agentId, loadData])

  const filteredSkills = availableSkills.filter(
    skill =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSkill = (skillId: string) => {
    const newSelected = new Set(selectedSkillIds)
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId)
    } else {
      newSelected.add(skillId)
    }
    setSelectedSkillIds(newSelected)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await agentService.setAgentSkills(agentId, Array.from(selectedSkillIds))
      toast.success(t('messages.skillsConfigured'))
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.configureFailed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('configureModal.title')}</DialogTitle>
          <DialogDescription>
            {t('configureModal.description', { name: agentName })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='size-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-4 py-4'>
            {/* 搜索框 */}
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder={t('searchSkills')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>

            {/* 统计信息 */}
            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <span>{t('totalSkills', { count: availableSkills.length })}</span>
              <span>•</span>
              <span>{t('selected', { count: selectedSkillIds.size })}</span>
            </div>

            {/* 技能列表 */}
            <div className='space-y-2'>
              {filteredSkills.length === 0 ? (
                <div className='py-8 text-center text-muted-foreground'>
                  {t('noSkillsFound')}
                </div>
              ) : (
                filteredSkills.map(skill => {
                  const isSelected = selectedSkillIds.has(skill.id)
                  const isSystem =
                    skill.owner_id === null || skill.owner_id === undefined

                  return (
                    <div
                      key={skill.id}
                      className='flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50'
                    >
                      <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <Wand2 className='size-4' />
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='font-medium font-mono'>
                            {skill.name}
                          </span>
                          {isSystem && (
                            <Badge
                              variant='secondary'
                              className='gap-1 text-xs'
                            >
                              <Lock className='size-3' />
                              {t('groupSystemBadge')}
                            </Badge>
                          )}
                        </div>
                        <p className='text-sm text-muted-foreground line-clamp-1'>
                          {skill.description}
                        </p>
                      </div>

                      <button
                        type='button'
                        onClick={() => toggleSkill(skill.id)}
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted hover:border-primary/50'
                        )}
                      >
                        {isSelected && <Check className='size-4' />}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className='flex items-center justify-between border-t pt-4'>
          <Button
            type='button'
            variant='ghost'
            onClick={onClose}
            disabled={isSaving}
          >
            {t('cancel')}
          </Button>
          <Button
            type='button'
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
