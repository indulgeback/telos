import React from 'react'
import BaseNode, { HandleConfig } from './BaseNode'
import { Split } from 'lucide-react'
import { Position, NodeProps } from '@xyflow/react'

const handles: HandleConfig[] = [
  { type: 'target', position: Position.Left },
  { type: 'source', position: Position.Right, id: 'true' },
  { type: 'source', position: Position.Right, id: 'false' },
]

const DecisionNode: React.FC<NodeProps> = ({ data }) => (
  <BaseNode
    icon={<Split className='text-[#4285F4] w-8 h-8' />}
    label={typeof data?.label === 'string' ? data.label : ''}
    desc={typeof data?.desc === 'string' ? data.desc : ''}
    shape='diamond'
    handles={handles}
    className='min-w-[120px] min-h-[120px]'
  />
)

export default DecisionNode
