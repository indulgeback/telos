import React from 'react'
import BaseNode, { HandleConfig } from './BaseNode'
import { Slack } from 'lucide-react'
import { Position, NodeProps } from '@xyflow/react'

const handles: HandleConfig[] = [{ type: 'target', position: Position.Left }]

const SlackNode: React.FC<NodeProps> = ({ data }) => (
  <BaseNode
    icon={<Slack className='text-pink-500 w-8 h-8' />}
    label={typeof data?.label === 'string' ? data.label : ''}
    desc={typeof data?.desc === 'string' ? data.desc : ''}
    shape='rect'
    handles={handles}
    className='min-w-[120px] min-h-[80px]'
  />
)

export default SlackNode
