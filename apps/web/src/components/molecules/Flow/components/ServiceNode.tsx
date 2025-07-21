import React from 'react'
import BaseNode, { HandleConfig } from './BaseNode'
import { ServerCrash } from 'lucide-react'
import { Position, NodeProps } from '@xyflow/react'

const handles: HandleConfig[] = [
  { type: 'target', position: Position.Top, id: 'serviceTop' },
  { type: 'target', position: Position.Bottom, id: 'serviceBottom' },
]

const ServiceNode: React.FC<NodeProps> = ({ data }) => (
  <BaseNode
    icon={<ServerCrash className='text-yellow-300 w-8 h-8' />}
    label={typeof data?.label === 'string' ? data.label : ''}
    desc={typeof data?.desc === 'string' ? data.desc : ''}
    shape='circle'
    handles={handles}
    className='min-w-[80px] min-h-[80px]'
  />
)

export default ServiceNode
