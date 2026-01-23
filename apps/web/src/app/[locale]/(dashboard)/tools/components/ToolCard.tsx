'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/atoms'
import { Button } from '@/components/atoms'
import {
  Badge,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms'
import {
  MoreVertical,
  Edit,
  Trash2,
  Globe,
  Lock,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react'
import { type Tool, toolService } from '@/service/tool'
import { EditToolModal } from './EditToolModal'
import { toast } from 'sonner'

interface ToolCardProps {
  tool: Tool
  onUpdate: () => void
}

export function ToolCard({ tool, onUpdate }: ToolCardProps) {
  const t = useTranslations('Tool')
  const [showEditModal, setShowEditModal] = useState(false)
  const [enabled, setEnabled] = useState(tool.enabled)
  const [isLoading, setIsLoading] = useState(false)

  // 获取分类图标
  const getCategoryIcon = () => {
    switch (tool.category) {
      case 'web':
        return <Globe className='size-4' />
      case 'api':
        return <Settings className='size-4' />
      default:
        return <Settings className='size-4' />
    }
  }

  // 获取分类颜色
  const getCategoryColor = () => {
    switch (tool.category) {
      case 'web':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'api':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'custom':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'test':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  // 切换工具启用状态
  const handleToggleEnabled = async () => {
    setIsLoading(true)
    try {
      await toolService.updateTool(tool.id, {
        ...tool,
        enabled: !enabled,
      })
      setEnabled(!enabled)
      toast.success(enabled ? t('messages.disabled') : t('messages.enabled'))
      onUpdate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.toggleFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  // 删除工具
  const handleDelete = async () => {
    if (!confirm(t('confirmDelete'))) return

    setIsLoading(true)
    try {
      await toolService.deleteTool(tool.id)
      toast.success(t('messages.deleted'))
      onUpdate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.deleteFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className='group relative overflow-hidden transition-all hover:shadow-lg'>
        {/* 状态指示条 */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${enabled ? 'bg-primary' : 'bg-muted'}`}
        />

        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2'>
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${getCategoryColor()}`}
              >
                {getCategoryIcon()}
              </div>
              <div>
                <CardTitle className='text-lg'>{tool.display_name}</CardTitle>
                <div className='flex items-center gap-2 mt-1'>
                  <Badge variant='outline' className='text-xs'>
                    {tool.name}
                  </Badge>
                  <Badge variant='secondary' className='text-xs capitalize'>
                    {tool.category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='opacity-0 group-hover:opacity-100 transition-opacity'
                >
                  <MoreVertical className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Edit className='mr-2 size-4' />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className='text-destructive'
                >
                  <Trash2 className='mr-2 size-4' />
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardDescription className='line-clamp-2 min-h-[2.5rem]'>
            {tool.description}
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-4'>
          {/* 端点信息 */}
          <div className='rounded-lg bg-muted/50 p-3'>
            <div className='mb-2 text-xs font-medium text-muted-foreground'>
              {t('endpoint')}
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <Badge variant='outline' className='font-mono text-xs'>
                {tool.endpoint.method}
              </Badge>
              <code className='flex-1 truncate text-xs'>
                {tool.endpoint.url_template}
              </code>
            </div>
          </div>

          {/* 参数信息 */}
          {Object.keys(tool.parameters.properties).length > 0 && (
            <div>
              <div className='mb-2 text-xs font-medium text-muted-foreground'>
                {t('parameters')}
              </div>
              <div className='flex flex-wrap gap-1'>
                {Object.entries(tool.parameters.properties)
                  .slice(0, 3)
                  .map(([name, param]) => (
                    <Badge key={name} variant='secondary' className='text-xs'>
                      {name}
                      {param.required && '*'}
                    </Badge>
                  ))}
                {Object.keys(tool.parameters.properties).length > 3 && (
                  <Badge variant='secondary' className='text-xs'>
                    +{Object.keys(tool.parameters.properties).length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* 底部操作栏 */}
          <div className='flex items-center justify-between pt-3 border-t'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              {enabled ? (
                <Eye className='size-3.5' />
              ) : (
                <EyeOff className='size-3.5' />
              )}
              <span className='text-xs'>
                {enabled ? t('enabled') : t('disabled')}
              </span>
            </div>

            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isLoading}
              className='data-[state=checked]:bg-primary'
            />
          </div>
        </CardContent>
      </Card>

      {/* 编辑工具弹窗 */}
      {showEditModal && (
        <EditToolModal
          tool={tool}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            onUpdate()
            setShowEditModal(false)
          }}
        />
      )}
    </>
  )
}
