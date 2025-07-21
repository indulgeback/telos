import React from 'react'
import { Handle, Position } from '@xyflow/react'

export type HandleConfig = {
  type: 'source' | 'target'
  position: Position
  id?: string
  style?: React.CSSProperties
}

export interface BaseNodeProps {
  icon?: React.ReactNode
  label: string
  desc?: string
  shape?: 'rect' | 'circle' | 'diamond'
  colorClass?: string
  handles?: HandleConfig[]
  className?: string
}

const shapeClassMap = {
  rect: 'rounded-2xl',
  circle: 'rounded-full',
  diamond: '',
}

const BaseNode: React.FC<BaseNodeProps> = ({
  icon,
  label,
  desc,
  shape = 'rect',
  colorClass = 'border-slate-200',
  handles = [],
  className = '',
}) => {
  return (
    <div
      className={`border ${colorClass} bg-white dark:bg-slate-900 shadow-lg shadow-primary/10 flex flex-col items-center justify-center text-center relative transition-all cursor-pointer px-6 py-5 min-w-[120px] min-h-[60px] ${shapeClassMap[shape] || ''} ${className}`}
    >
      {icon && <div className='mb-2'>{icon}</div>}
      <div className='font-extrabold text-primary text-lg mb-1 tracking-wide'>
        {label}
      </div>
      {desc && <div className='text-xs text-muted-foreground mt-1'>{desc}</div>}
      {handles.map((h, i) => (
        <Handle
          key={h.id || i}
          type={h.type}
          position={h.position}
          id={h.id}
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: 'var(--primary)',
            ...h.style,
          }}
        />
      ))}
    </div>
  )
}

export default BaseNode
