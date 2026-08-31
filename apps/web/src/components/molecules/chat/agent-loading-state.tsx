'use client'

import LoadingState from '@/components/primitives/LoadingState'

export function AgentLoadingState({ label }: { label: string }) {
  return (
    <div className='beautiful-ui py-1' data-loading-state='beautiful-ui'>
      <LoadingState label={label} variant='Drive' />
    </div>
  )
}
