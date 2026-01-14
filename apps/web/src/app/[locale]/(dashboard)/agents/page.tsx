'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atoms'
import { agentService, type Agent } from '@/service/agent'
import { CreateAgentModal } from './components/CreateAgentModal'
import { AgentCard } from './components/AgentCard'
import { Plus, Sparkles } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export default function AgentsPage() {
  const t = useTranslations('Agent')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await agentService.listAgents()
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  return (
    <div className='container mx-auto py-8'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10'>
            <Sparkles className='size-5 text-primary' />
          </div>
          <div>
            <h1 className='text-3xl font-bold'>{t('title')}</h1>
            <p className='text-muted-foreground'>{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className='mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4'>
          <p className='text-sm text-destructive'>{error}</p>
        </div>
      )}

      {/* Create Button */}
      <div className='mb-6 flex justify-end'>
        <Button onClick={() => setShowCreateModal(true)} className='gap-2'>
          <Plus className='size-4' />
          {t('create')}
        </Button>
      </div>

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
              <h3 className='mb-2 text-lg font-semibold'>{t('empty.title')}</h3>
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
                <AgentCard key={agent.id} agent={agent} onUpdate={loadAgents} />
              ))}
            </div>
          )}
        </>
      )}

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
