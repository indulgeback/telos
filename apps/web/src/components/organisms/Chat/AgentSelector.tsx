'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@/components/atoms'
import { agentService, type Agent } from '@/service/agent'
import { Sparkles, Check, ChevronsUpDown, Bot, Lock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface AgentSelectorProps {
  selectedAgentId: string | null
  onAgentChange: (agent: Agent) => void
}

export function AgentSelector({
  selectedAgentId,
  onAgentChange,
}: AgentSelectorProps) {
  const t = useTranslations('Agent')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const loadAgents = async () => {
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
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  const getTypeIcon = (type: Agent['type']) => {
    switch (type) {
      case 'system':
        return <Bot className='mr-2 size-4' />
      case 'private':
        return <Lock className='mr-2 size-4' />
      case 'public':
        return <Globe className='mr-2 size-4' />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-[200px] justify-between'
        >
          {selectedAgent ? (
            <div className='flex items-center truncate'>
              {getTypeIcon(selectedAgent.type)}
              <span className='truncate'>{selectedAgent.name}</span>
            </div>
          ) : (
            <div className='flex items-center'>
              <Sparkles className='mr-2 size-4' />
              {loading ? t('selector.loading') : t('selector.selectAgent')}
            </div>
          )}
          <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[280px] p-0'>
        <div className='p-2'>
          <p className='px-2 py-1.5 text-sm text-muted-foreground'>
            {t('selector.label')}
          </p>
          <ScrollArea className='h-[200px]'>
            <div className='space-y-1 p-1'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='size-4 animate-spin text-muted-foreground' />
                </div>
              ) : agents.length === 0 ? (
                <div className='py-4 text-center text-sm text-muted-foreground'>
                  {t('selector.noAgents')}
                </div>
              ) : (
                agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      onAgentChange(agent)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm',
                      'transition-colors hover:bg-accent',
                      agent.id === selectedAgentId && 'bg-accent'
                    )}
                  >
                    {getTypeIcon(agent.type)}
                    <span className='flex-1 truncate text-left'>
                      {agent.name}
                    </span>
                    {agent.is_default && (
                      <span className='text-xs text-muted-foreground'>
                        {t('default')}
                      </span>
                    )}
                    {agent.id === selectedAgentId && (
                      <Check className='size-4 shrink-0' />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
