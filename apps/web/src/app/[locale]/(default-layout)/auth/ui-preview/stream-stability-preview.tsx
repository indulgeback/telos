'use client'

import { useEffect, useState } from 'react'
import { ThinkingTrace } from '@/components/molecules/chat/thinking-trace'
import { ToolCallGroup } from '@/components/molecules/chat/tool-call-status'

const REASONING_TEXT =
  'Inspecting the request, preserving the current component tree, and updating the response in place.'
const TOOL_OUTPUT =
  'Generated the image and stored the complete cloud asset URL for the final response.'

export function StreamStabilityPreview() {
  const [tick, setTick] = useState(1)
  const maxLength = Math.max(REASONING_TEXT.length, TOOL_OUTPUT.length)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(current => (current >= maxLength ? 1 : current + 1))
    }, 45)
    return () => window.clearInterval(timer)
  }, [maxLength])

  return (
    <div data-stream-stability-preview className='space-y-4'>
      <ThinkingTrace
        text={REASONING_TEXT.slice(0, tick)}
        state='streaming'
        title='Reasoning process'
        thinkingLabel='In the middle of reasoning'
        doneLabel='Reasoning complete'
      />
      <ToolCallGroup
        tools={[
          {
            toolCallId: 'stable-generate-image',
            toolName: 'generate_image',
            state: 'running',
            outputText: TOOL_OUTPUT.slice(0, tick),
          },
        ]}
      />
    </div>
  )
}
