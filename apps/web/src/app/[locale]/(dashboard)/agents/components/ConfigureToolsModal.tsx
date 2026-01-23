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
import { Switch } from '@/components/atoms'
import { Badge } from '@/components/atoms'
import { Loader2, Check, Search, Globe, Settings, Database } from 'lucide-react'
import { Input } from '@/components/atoms'
import { toolService, type Tool, type AgentTool } from '@/service/tool'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ConfigureToolsModalProps {
  agentId: string
  agentName: string
  onClose: () => void
  onSuccess: () => void
}

export function ConfigureToolsModal({
  agentId,
  agentName,
  onClose,
  onSuccess,
}: ConfigureToolsModalProps) {
  const t = useTranslations('Tool')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 所有可用工具
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  // Agent 已配置的工具
  const [agentTools, setAgentTools] = useState<AgentTool[]>([])
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('')
  // 选中的工具 ID
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set())

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 获取所有可用工具
      const toolsData = await toolService.listTools({ enabled: true })
      setAvailableTools(toolsData.tools)

      // 获取 Agent 的工具配置
      const agentToolsData = await toolService.getAgentTools(agentId)
      setAgentTools(agentToolsData.tools)

      // 初始化选中状态
      const enabledIds = new Set(
        agentToolsData.tools.filter(t => t.enabled).map(t => t.tool_id)
      )
      setSelectedToolIds(enabledIds)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load tools'
      )
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    loadData()
  }, [agentId, loadData])

  // 过滤工具
  const filteredTools = availableTools.filter(
    tool =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 切换工具选中状态
  const toggleTool = (toolId: string) => {
    const newSelected = new Set(selectedToolIds)
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId)
    } else {
      newSelected.add(toolId)
    }
    setSelectedToolIds(newSelected)
  }

  // 保存配置
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await toolService.setAgentTools(agentId, Array.from(selectedToolIds))
      toast.success(t('messages.toolsConfigured'))
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('messages.configureFailed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'web':
        return <Globe className='size-4' />
      case 'api':
        return <Settings className='size-4' />
      case 'database':
        return <Database className='size-4' />
      default:
        return <Settings className='size-4' />
    }
  }

  // 获取分类颜色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'web':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'api':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'database':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'custom':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
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
                placeholder={t('searchTools')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>

            {/* 统计信息 */}
            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <span>{t('totalTools', { count: availableTools.length })}</span>
              <span>•</span>
              <span>{t('selected', { count: selectedToolIds.size })}</span>
            </div>

            {/* 工具列表 */}
            <div className='space-y-2'>
              {filteredTools.length === 0 ? (
                <div className='py-8 text-center text-muted-foreground'>
                  {t('noToolsFound')}
                </div>
              ) : (
                filteredTools.map(tool => {
                  const isSelected = selectedToolIds.has(tool.id)
                  const isCurrentlyEnabled = agentTools.some(
                    t => t.tool_id === tool.id && t.enabled
                  )

                  return (
                    <div
                      key={tool.id}
                      className='flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50'
                    >
                      {/* 工具图标和信息 */}
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${getCategoryColor(tool.category)}`}
                      >
                        {getCategoryIcon(tool.category)}
                      </div>

                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>
                            {tool.display_name}
                          </span>
                          <Badge variant='outline' className='text-xs'>
                            {tool.name}
                          </Badge>
                          <Badge
                            variant='secondary'
                            className='text-xs capitalize'
                          >
                            {tool.category}
                          </Badge>
                        </div>
                        <p className='text-sm text-muted-foreground line-clamp-1'>
                          {tool.description}
                        </p>
                      </div>

                      {/* 选中指示器 */}
                      <button
                        type='button'
                        onClick={() => toggleTool(tool.id)}
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full border-2 transition-colors',
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

            {/* 分类说明 */}
            <div className='rounded-lg bg-muted/50 p-4'>
              <h4 className='mb-2 text-sm font-medium'>
                {t('toolCategories')}
              </h4>
              <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                <span className='flex items-center gap-1'>
                  <div className='size-2 rounded-full bg-blue-500' />
                  Web
                </span>
                <span className='flex items-center gap-1'>
                  <div className='size-2 rounded-full bg-green-500' />
                  API
                </span>
                <span className='flex items-center gap-1'>
                  <div className='size-2 rounded-full bg-purple-500' />
                  Database
                </span>
                <span className='flex items-center gap-1'>
                  <div className='size-2 rounded-full bg-orange-500' />
                  Custom
                </span>
              </div>
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
