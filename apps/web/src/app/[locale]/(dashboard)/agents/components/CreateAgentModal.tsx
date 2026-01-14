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
import { Textarea } from '@/components/atoms'
import { Label } from '@/components/atoms'
import { agentService } from '@/service/agent'
import { Loader2, Globe, Lock, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateAgentModalProps {
  onClose: () => void
  onSuccess: () => void
}

type AgentTypeOption = 'public' | 'private'

export function CreateAgentModal({
  onClose,
  onSuccess,
}: CreateAgentModalProps) {
  const t = useTranslations('Agent')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<AgentTypeOption>('private')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !description.trim()) {
      toast.error(t('form.required'))
      return
    }

    setIsCreating(true)
    try {
      await agentService.createAgent({
        name: name.trim(),
        description: description.trim(),
        type,
      })
      toast.success(t('messages.createSuccess'))
      setName('')
      setDescription('')
      setType('private')
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.createError')
      )
    } finally {
      setIsCreating(false)
    }
  }

  const typeOptions: {
    value: AgentTypeOption
    icon: React.ReactNode
    title: string
    description: string
  }[] = [
    {
      value: 'private',
      icon: <Lock className='size-5' />,
      title: t('form.typePrivate'),
      description: t('form.typePrivateDesc'),
    },
    {
      value: 'public',
      icon: <Globe className='size-5' />,
      title: t('form.typePublic'),
      description: t('form.typePublicDesc'),
    },
  ]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='size-5 text-primary' />
            {t('create')}
          </DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Name */}
          <div className='space-y-2'>
            <Label htmlFor='name'>
              {t('form.name')} <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='name'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              disabled={isCreating}
              maxLength={100}
            />
            <p className='text-xs text-muted-foreground'>{name.length}/100</p>
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <Label htmlFor='description'>
              {t('form.descriptionLabel')}{' '}
              <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='description'
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              disabled={isCreating}
              rows={4}
              maxLength={500}
              className='resize-none'
            />
            <p className='text-xs text-muted-foreground'>
              {description.length}/500
            </p>
          </div>

          {/* Type Selection */}
          <div className='space-y-3'>
            <Label>
              {t('form.typeLabel')} <span className='text-destructive'>*</span>
            </Label>
            <div className='grid grid-cols-2 gap-3'>
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => setType(option.value)}
                  disabled={isCreating}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
                    'hover:bg-accent/50',
                    type === option.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-muted'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      type === option.value
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )}
                  >
                    {option.icon}
                    <span className='font-medium'>{option.title}</span>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={isCreating}
            >
              {t('cancel')}
            </Button>
            <Button
              type='submit'
              disabled={isCreating || !name.trim() || !description.trim()}
            >
              {isCreating && <Loader2 className='mr-2 size-4 animate-spin' />}
              {t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
