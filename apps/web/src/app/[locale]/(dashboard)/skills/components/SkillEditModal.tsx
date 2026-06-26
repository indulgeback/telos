'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms'
import { Button } from '@/components/atoms'
import { Input } from '@/components/atoms'
import { Label } from '@/components/atoms'
import { Textarea } from '@/components/atoms'
import { agentService, type Skill } from '@/service/agent'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SkillEditModalProps {
  skill?: Skill
  onClose: () => void
  onSuccess: () => void
}

export function SkillEditModal({
  skill,
  onClose,
  onSuccess,
}: SkillEditModalProps) {
  const t = useTranslations('Skill')
  const isEdit = !!skill
  const isSystem = skill?.owner_id === null || skill?.owner_id === undefined

  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [content, setContent] = useState(
    skill?.content ?? skill?.markdown ?? ''
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSystem) return

    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (!trimmedName) {
      toast.error(t('form.nameRequired'))
      return
    }
    if (!trimmedDesc) {
      toast.error(t('form.descriptionRequired'))
      return
    }
    if (!content.trim()) {
      toast.error(t('form.contentRequired'))
      return
    }

    setIsSaving(true)
    try {
      if (isEdit && skill) {
        await agentService.updateSkill(skill.id, {
          name: trimmedName,
          description: trimmedDesc,
          content,
        })
        toast.success(t('messages.updated'))
      } else {
        await agentService.createSkill({
          name: trimmedName,
          description: trimmedDesc,
          markdown: content,
        })
        toast.success(t('messages.created'))
      }
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEdit
            ? t('messages.updateFailed')
            : t('messages.createFailed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit') : t('create')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          {/* 技能名称 */}
          <div className='space-y-2'>
            <Label htmlFor='skill-name'>{t('form.name')}</Label>
            <Input
              id='skill-name'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              disabled={isSaving || isSystem}
              className='font-mono'
            />
          </div>

          {/* 技能描述 */}
          <div className='space-y-2'>
            <Label htmlFor='skill-desc'>{t('form.description')}</Label>
            <Input
              id='skill-desc'
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              disabled={isSaving || isSystem}
            />
          </div>

          {/* 技能内容 */}
          <div className='space-y-2'>
            <Label htmlFor='skill-content'>{t('form.content')}</Label>
            <Textarea
              id='skill-content'
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('form.contentPlaceholder')}
              disabled={isSaving || isSystem}
              rows={10}
              className='resize-y font-mono text-sm'
            />
            <p className='text-xs text-muted-foreground'>
              {t('form.contentHelp')}
            </p>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='ghost'
              onClick={onClose}
              disabled={isSaving}
            >
              {t('cancel')}
            </Button>
            <Button type='submit' disabled={isSaving || isSystem}>
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  {t('saving')}
                </>
              ) : isEdit ? (
                t('save')
              ) : (
                t('create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
