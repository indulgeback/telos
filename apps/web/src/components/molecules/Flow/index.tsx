'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Node, Edge, Connection } from '@xyflow/react'
import TriggerNode from './components/TriggerNode'
import AgentNode from './components/AgentNode'
import DecisionNode from './components/DecisionNode'
import ServiceNode from './components/ServiceNode'
import SlackNode from './components/SlackNode'

interface IProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  className?: string
  showBackground?: boolean
  showControls?: boolean
  showMiniMap?: boolean
  ref?: React.RefObject<HTMLDivElement | null>
}

export const Flow: React.FC<IProps> = ({
  initialNodes,
  initialEdges,
  className,
  showBackground = false,
  showControls = false,
  showMiniMap = false,
  ref,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(edgesSnapshot => addEdge(params, edgesSnapshot)),
    []
  )

  return (
    <div className={className} ref={ref}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        zoomOnScroll={false}
        preventScrolling={false}
        nodeTypes={{
          trigger: TriggerNode,
          agent: AgentNode,
          decision: DecisionNode,
          service: ServiceNode,
          slack: SlackNode,
        }}
      >
        {showBackground && <Background />}
        {showControls && <Controls />}
        {showMiniMap && <MiniMap zoomable pannable />}
      </ReactFlow>
    </div>
  )
}
