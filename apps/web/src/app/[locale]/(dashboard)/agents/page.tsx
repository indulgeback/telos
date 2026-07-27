'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atoms'
import { agentService, type Agent } from '@/service/agent'
import { CreateAgentModal } from './components/CreateAgentModal'
import { AgentCard } from './components/AgentCard'
import { AgentHeroBanner } from './components/AgentHeroBanner'
import { Plus, Sparkles } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export default function AgentsPage() {
  const t = useTranslations('Agent')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgents = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const data = await agentService.listAgents()
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAgents()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  // 轮询生成中的 Agent 提示词状态
  useEffect(() => {
    const hasGenerating = agents.some(
      agent => agent.instruction_status === 'generating'
    )
    if (!hasGenerating) return

    const timer = setInterval(() => {
      loadAgents(true)
    }, 3000)

    return () => clearInterval(timer)
  }, [agents])

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='shrink-0 border-b border-border/60 bg-background/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/85'>
        <div className='container mx-auto flex items-center justify-between'>
          <h1 className='text-3xl font-bold'>Agents</h1>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto px-6 py-8'>
        <div className='container mx-auto space-y-8'>
          <AgentHeroBanner onCreate={() => setShowCreateModal(true)} />

          {/* Error State */}
          {error && (
            <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4'>
              <p className='text-sm text-destructive'>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='size-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <>
              {/* Empty State */}
              {agents.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='mb-4 flex size-20 items-center justify-center rounded-full bg-muted'>
                    <Sparkles className='size-10 text-muted-foreground' />
                  </div>
                  <h3 className='mb-2 text-lg font-semibold'>
                    {t('empty.title')}
                  </h3>
                  <p className='mb-6 text-sm text-muted-foreground'>
                    {t('empty.description')}
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className='gap-2'
                  >
                    <Plus className='size-4' />
                    {t('create')}
                  </Button>
                </div>
              ) : (
                /* Agents Grid */
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                  {agents.map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onUpdate={loadAgents}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadAgents()
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
