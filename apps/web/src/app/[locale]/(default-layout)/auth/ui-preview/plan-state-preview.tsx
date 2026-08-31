'use client'

import { useState } from 'react'
import { PlanPanel } from '@/components/molecules/chat/PlanPanel'

const STEPS = [
  {
    description:
      'Confirm the complete visual direction, composition, and delivery constraints before starting execution',
    tool_hint: 'clarify_question',
  },
  {
    description:
      'Organize the source material and assign a clear purpose to every generated asset',
  },
  {
    description:
      'Generate the required assets while preserving the approved style and visual continuity',
  },
  {
    description:
      'Review composition, typography, spacing, and consistency across the complete output',
  },
  {
    description:
      'Assemble the final delivery and verify every file before presenting it to the user',
  },
]

export function PlanStatePreview() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(
    'pending'
  )

  return (
    <PlanPanel
      summary='Refine the agent interface while preserving live execution and approval behavior.'
      steps={STEPS}
      status={status}
      titleLabel='Execution plan'
      approveLabel='Approve & execute'
      rejectLabel='Reject'
      approvedLabel='Approved'
      rejectedLabel='Rejected'
      pendingLabel='Pending'
      completedLabel='Completed'
      failedLabel='Failed'
      executingLabel='Executing'
      onApprove={() => setStatus('approved')}
      onReject={() => setStatus('rejected')}
    />
  )
}
