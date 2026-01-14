'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
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
import { agentService, type Agent } from '@/service/agent'
import { Edit2, Trash2, Sparkles, Lock, Globe, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface AgentCardProps {
  agent: Agent
  onUpdate: () => void
}

export function AgentCard({ agent, onUpdate }: AgentCardProps) {
  const t = useTranslations('Agent')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await agentService.deleteAgent(agent.id)
      toast.success(t('messages.deleteSuccess'))
      setShowDeleteDialog(false)
      onUpdate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.deleteError')
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const getTypeIcon = () => {
    switch (agent.type) {
      case 'system':
        return <Bot className='size-4' />
      case 'private':
        return <Lock className='size-4' />
      case 'public':
        return <Globe className='size-4' />
    }
  }

  const getTypeBadgeVariant = ():
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline' => {
    switch (agent.type) {
      case 'system':
        return 'default'
      case 'private':
        return 'secondary'
      case 'public':
        return 'outline'
    }
  }

  const canEdit = agent.type !== 'system' && !agent.is_default
  const canDelete = canEdit

  return (
    <>
      <Card
        className={cn(
          'group transition-all hover:shadow-md',
          !canEdit && 'opacity-80'
        )}
      >
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-primary/10'>
                {getTypeIcon()}
              </div>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-lg'>{agent.name}</CardTitle>
                {agent.is_default && (
                  <Badge variant='default' className='text-xs'>
                    {t('default')}
                  </Badge>
                )}
              </div>
            </div>
            <Badge variant={getTypeBadgeVariant()} className='text-xs'>
              {t(`types.${agent.type}`)}
            </Badge>
          </div>
          <CardDescription className='line-clamp-2 min-h-[40px]'>
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* System Prompt Preview */}
          <div className='rounded-md bg-muted/50 p-3'>
            <p className='text-xs text-muted-foreground line-clamp-3'>
              {agent.system_prompt}
            </p>
          </div>

          {/* Metadata */}
          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <span>
              {t('created')}{' '}
              {formatDistanceToNow(new Date(agent.created_at), {
                addSuffix: true,
              })}
            </span>
            {agent.owner_name && agent.type !== 'system' && (
              <span>by {agent.owner_name}</span>
            )}
          </div>

          {/* Actions */}
          <div className='flex gap-2 pt-2 border-t'>
            {canEdit && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1 gap-1'
                disabled
              >
                <Edit2 className='size-3' />
                {t('edit')}
              </Button>
            )}
            {canDelete && (
              <Button
                variant='outline'
                size='sm'
                className={cn(
                  'gap-1 text-destructive hover:text-destructive hover:bg-destructive/10',
                  canEdit && 'flex-1'
                )}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className='size-3' />
                {t('delete')}
              </Button>
            )}
            {!canEdit && (
              <div className='flex-1 text-center text-xs text-muted-foreground py-2'>
                {t('systemAgentReadOnly')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('messages.deleteConfirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('messages.deleteConfirm.description')}
            </AlertDialogDescription>
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
              {isDeleting ? t('deleting') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
