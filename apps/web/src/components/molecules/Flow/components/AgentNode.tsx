import React from 'react'
import BaseNode, { HandleConfig } from './BaseNode'
import { Bot } from 'lucide-react'
import { Position, NodeProps } from '@xyflow/react'

const handles: HandleConfig[] = [
  { type: 'target', position: Position.Left },
  { type: 'source', position: Position.Right },
  {
    type: 'source',
    position: Position.Bottom,
    id: 'model',
    style: { left: 20 },
  },
  {
    type: 'source',
    position: Position.Bottom,
    id: 'memory',
  },
  {
    type: 'source',
    position: Position.Bottom,
    id: 'tool',
    style: { right: 20 },
  },
]

const AgentNode: React.FC<NodeProps> = ({ data }) => (
  <BaseNode
    icon={<Bot className='text-primary w-8 h-8' />}
    label={typeof data?.label === 'string' ? data.label : ''}
    desc={typeof data?.desc === 'string' ? data.desc : ''}
    shape='rect'
    handles={handles}
    className='min-w-[220px] min-h-[90px]'
  />
)

export default AgentNode
