'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
} from '@/components/atoms'
import { agentService, type Skill } from '@/service/agent'
import { Edit2, Trash2, Wand2, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SkillEditModal } from './SkillEditModal'

interface SkillCardProps {
  skill: Skill
  onUpdate: () => void
}

export function SkillCard({ skill, onUpdate }: SkillCardProps) {
  const t = useTranslations('Skill')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 系统技能(owner_id 为 null)只读,不可编辑/删除
  const isSystem = skill.owner_id === null || skill.owner_id === undefined

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await agentService.deleteSkill(skill.id)
      toast.success(t('messages.deleted'))
      onUpdate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.deleteFailed')
      )
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex items-center gap-2 min-w-0'>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                <Wand2 className='size-4 text-primary' />
              </div>
              <div className='min-w-0'>
                <CardTitle className='truncate font-mono text-base'>
                  {skill.name}
                </CardTitle>
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-1.5'>
              {isSystem && (
                <Badge variant='secondary' className='gap-1'>
                  <Lock className='size-3' />
                  {t('groupSystemBadge')}
                </Badge>
              )}
              <Badge variant={skill.enabled ? 'default' : 'outline'}>
                {skill.enabled ? t('enabled') : t('disabled')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className='mb-4 line-clamp-2 text-sm text-muted-foreground'>
            {skill.description}
          </p>

          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='ghost'
              size='sm'
              className='gap-1.5'
              disabled={isSystem}
              onClick={() => setShowEditModal(true)}
            >
              <Edit2 className='size-3.5' />
              {t('edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='gap-1.5 text-destructive hover:text-destructive'
              disabled={isSystem}
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className='size-3.5' />
              {t('delete')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showEditModal && (
        <SkillEditModal
          skill={skill}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            onUpdate()
            setShowEditModal(false)
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{skill.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeleting ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  {t('saving')}
                </>
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
