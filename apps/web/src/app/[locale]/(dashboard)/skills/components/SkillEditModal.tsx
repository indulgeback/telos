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
      <DialogContent className='sm:max-w-2xl h-[85vh] flex flex-col p-6 overflow-hidden'>
        <DialogHeader className='shrink-0 pb-2'>
          <DialogTitle>{isEdit ? t('edit') : t('create')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className='flex flex-col flex-1 overflow-hidden min-h-0'
        >
          {/* Scrollable Form Content */}
          <div className='flex-1 overflow-y-auto pr-1 py-2 space-y-4 min-h-0'>
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
            <div className='space-y-2 flex flex-col h-[380px]'>
              <Label htmlFor='skill-content' className='mb-1'>
                {t('form.content')}
              </Label>
              <Textarea
                id='skill-content'
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('form.contentPlaceholder')}
                disabled={isSaving || isSystem}
                className='flex-1 font-mono text-sm resize-none'
              />
              <p className='text-xs text-muted-foreground mt-1'>
                {t('form.contentHelp')}
              </p>
            </div>
          </div>

          {/* Sticky Footer */}
          <DialogFooter className='shrink-0 border-t pt-4 mt-4'>
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
