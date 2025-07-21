import React from 'react'
import BaseNode, { HandleConfig } from './BaseNode'
import { Zap } from 'lucide-react'
import { Position, NodeProps } from '@xyflow/react'

const handles: HandleConfig[] = [{ type: 'source', position: Position.Right }]

const TriggerNode: React.FC<NodeProps> = ({ data }) => (
  <BaseNode
    icon={<Zap className='text-yellow-400 w-8 h-8' />}
    label={typeof data?.label === 'string' ? data.label : ''}
    desc={typeof data?.desc === 'string' ? data.desc : ''}
    shape='rect'
    handles={handles}
  />
)

export default TriggerNode
