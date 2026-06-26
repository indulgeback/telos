'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@/components/atoms'
import { agentService, type Skill } from '@/service/agent'
import { Download, Check, Loader2 } from 'lucide-react'
import { getCategoryMeta } from './category'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface StoreSkillCardProps {
  skill: Skill
  /** 用户是否已安装同名技能(决定按钮显示 安装/已安装) */
  installed: boolean
  /** 安装成功后的回调(刷新父组件状态) */
  onInstalled: () => void
}

export function StoreSkillCard({
  skill,
  installed,
  onInstalled,
}: StoreSkillCardProps) {
  const t = useTranslations('Skill')
  const [isInstalling, setIsInstalling] = useState(false)

  const categoryId =
    (skill.metadata as { category?: string } | undefined)?.category ?? undefined
  const catMeta = getCategoryMeta(categoryId)
  const CategoryIcon = catMeta.icon

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await agentService.installSkill(skill.id)
      toast.success(t('store.installSuccess'))
      onInstalled()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('store.installFailed')
      )
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <Card className='flex flex-col'>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <CategoryIcon
              className={cn('size-4 shrink-0', catMeta.iconColor)}
            />
            <div className='min-w-0'>
              <CardTitle className='truncate font-mono text-base'>
                {skill.name}
              </CardTitle>
            </div>
          </div>
          {categoryId && (
            <Badge variant='secondary' className='shrink-0 capitalize'>
              {t(`category.${categoryId}`, { defaultMessage: categoryId })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col'>
        <p className='mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground'>
          {skill.description}
        </p>

        <div className='flex justify-end'>
          <Button
            size='sm'
            variant={installed ? 'secondary' : 'default'}
            className='gap-1.5'
            disabled={installed || isInstalling}
            onClick={handleInstall}
          >
            {isInstalling ? (
              <>
                <Loader2 className='size-3.5 animate-spin' />
                {t('store.installing')}
              </>
            ) : installed ? (
              <>
                <Check className='size-3.5' />
                {t('store.installed')}
              </>
            ) : (
              <>
                <Download className='size-3.5' />
                {t('store.install')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
