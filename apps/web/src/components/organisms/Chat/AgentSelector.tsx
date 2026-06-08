'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  AiLottieIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms'
import { agentService, type Agent } from '@/service/agent'
import { Sparkles, Lock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentSelectorProps {
  selectedAgentId: string | null
  onAgentChange: (agent: Agent) => void
  className?: string
}

export function AgentSelector({
  selectedAgentId,
  onAgentChange,
  className,
}: AgentSelectorProps) {
  const t = useTranslations('Agent')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const loadAgents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentService.listAgents()
      setAgents(data)
      // Set default agent if none selected
      if (!selectedAgentId && data.length > 0) {
        const defaultAgent = data.find(a => a.is_default) || data[0]
        onAgentChange(defaultAgent)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAgentId, onAgentChange])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find(item => item.id === agentId)
    if (agent) onAgentChange(agent)
  }

  const getTypeIcon = (type: Agent['type']) => {
    switch (type) {
      case 'system':
        return <AiLottieIcon className='size-3.5 shrink-0' />
      case 'private':
        return <Lock className='size-3.5 shrink-0' />
      case 'public':
        return <Globe className='size-3.5 shrink-0' />
    }
  }

  return (
    <Select
      value={selectedAgentId || undefined}
      onValueChange={handleAgentChange}
      disabled={loading || agents.length === 0}
    >
      <SelectTrigger
        size='sm'
        className={cn(
          'h-8 w-full min-w-0 overflow-hidden rounded-md border-border/70 bg-background px-2.5 text-xs font-normal shadow-none hover:bg-accent/50',
          className
        )}
      >
        <span className='sr-only'>{t('selector.label')}</span>
        {selectedAgent ? (
          <span className='flex min-w-0 items-center gap-1.5'>
            {getTypeIcon(selectedAgent.type)}
            <span className='truncate'>{selectedAgent.name}</span>
          </span>
        ) : (
          <span className='flex min-w-0 items-center gap-1.5'>
            <Sparkles className='size-3.5 shrink-0' />
            <SelectValue
              placeholder={
                loading ? t('selector.loading') : t('selector.selectAgent')
              }
            />
          </span>
        )}
      </SelectTrigger>
      <SelectContent>
        {agents.length === 0 ? (
          <SelectItem value='__empty_agent__' disabled>
            {loading ? t('selector.loading') : t('selector.noAgents')}
          </SelectItem>
        ) : (
          agents.map(agent => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className='flex w-full items-center justify-between gap-2'>
                <span className='flex min-w-0 items-center gap-1.5'>
                  {getTypeIcon(agent.type)}
                  <span className='truncate'>{agent.name}</span>
                </span>
                {agent.is_default && (
                  <span className='text-[10px] text-muted-foreground'>
                    {t('default')}
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
