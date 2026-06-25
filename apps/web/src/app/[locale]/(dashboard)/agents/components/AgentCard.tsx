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
import {
  Edit2,
  Trash2,
  Sparkles,
  Lock,
  Globe,
  Bot,
  Settings,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ConfigureToolsModal } from './ConfigureToolsModal'
import { EditAgentModal } from './EditAgentModal'

interface AgentCardProps {
  agent: Agent
  onUpdate: () => void
}

export function AgentCard({ agent, onUpdate }: AgentCardProps) {
  const t = useTranslations('Agent')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showToolsModal, setShowToolsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  const handleToggleDefault = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSettingDefault) return
    setIsSettingDefault(true)
    try {
      if (agent.is_user_default) {
        await agentService.setUserDefaultAgent(null)
        toast.success(t('messages.cancelDefaultSuccess'))
      } else {
        await agentService.setUserDefaultAgent(agent.id)
        toast.success(t('messages.setDefaultSuccess', { name: agent.name }))
      }
      onUpdate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.setDefaultError')
      )
    } finally {
      setIsSettingDefault(false)
    }
  }

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
                {agent.is_user_default && (
                  <Badge variant='default' className='text-xs'>
                    {t('systemDefault')}
                  </Badge>
                )}
              </div>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='ghost'
                size='icon'
                disabled={isSettingDefault}
                className={cn(
                  'size-7 p-0 rounded-full transition-all duration-200',
                  agent.is_user_default
                    ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                    : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                )}
                onClick={handleToggleDefault}
                title={
                  agent.is_user_default
                    ? t('cancelUserDefault')
                    : t('setUserDefault')
                }
              >
                <Star
                  className={cn(
                    'size-4 transition-transform active:scale-90',
                    agent.is_user_default && 'fill-current'
                  )}
                />
              </Button>
              <Badge variant={getTypeBadgeVariant()} className='text-xs'>
                {t(`types.${agent.type}`)}
              </Badge>
            </div>
          </div>
          <CardDescription className='line-clamp-2 min-h-[40px]'>
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Prompt status feedback */}
          {agent.instruction_status === 'generating' && (
            <div className='flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/10 rounded p-2 animate-pulse'>
              <Sparkles className='size-3.5 animate-spin' />
              <span>{t('promptStatus.generating')}</span>
            </div>
          )}
          {agent.instruction_status === 'failed' && (
            <div className='flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded p-2'>
              <span className='font-bold'>⚠️</span>
              <span>{t('promptStatus.failed')}</span>
            </div>
          )}

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
          <div className='grid grid-cols-2 gap-2 pt-2 border-t'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1 w-full'
              onClick={() => setShowToolsModal(true)}
            >
              <Settings className='size-3' />
              {t('configureTools')}
            </Button>
            {canEdit && agent.instruction_status !== 'generating' && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1 w-full'
                onClick={async () => {
                  try {
                    await agentService.regenerateInstructions(agent.id)
                    toast.success(t('messages.enhancePromptStart'))
                    onUpdate()
                  } catch (error) {
                    toast.error(t('messages.enhancePromptError'))
                  }
                }}
              >
                <Sparkles className='size-3' />
                {t('enhancePrompt')}
              </Button>
            )}
            {canEdit && agent.instruction_status === 'generating' && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1 w-full text-primary'
                disabled
              >
                <Sparkles className='size-3 animate-spin' />
                {t('enhancing')}
              </Button>
            )}
            {canEdit && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1 w-full'
                onClick={() => setShowEditModal(true)}
              >
                <Edit2 className='size-3' />
                {t('edit')}
              </Button>
            )}
            {canDelete && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1 w-full text-destructive hover:text-destructive hover:bg-destructive/10'
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className='size-3' />
                {t('delete')}
              </Button>
            )}
            {!canEdit && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1 w-full text-muted-foreground'
                onClick={() => setShowEditModal(true)}
              >
                <Edit2 className='size-3' />
                {t('viewPrompt')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit/View Agent Modal */}
      {showEditModal && (
        <EditAgentModal
          agent={agent}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            onUpdate()
            setShowEditModal(false)
          }}
        />
      )}

      {/* Configure Tools Modal */}
      {showToolsModal && (
        <ConfigureToolsModal
          agentId={agent.id}
          agentName={agent.name}
          onClose={() => setShowToolsModal(false)}
          onSuccess={() => {
            onUpdate()
            setShowToolsModal(false)
          }}
        />
      )}

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
