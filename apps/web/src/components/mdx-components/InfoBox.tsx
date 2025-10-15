import React from 'react'
import { AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface InfoBoxProps {
  type?: 'info' | 'warning' | 'note'
  title?: string
  children: React.ReactNode
}

export function InfoBox({ type = 'info', title, children }: InfoBoxProps) {
  const icons = {
    info: <Info className='mdx-infobox-icon' />,
    warning: <AlertTriangle className='mdx-infobox-icon' />,
    note: <AlertCircle className='mdx-infobox-icon' />,
  }

  const typeClasses = {
    info: 'mdx-infobox-info',
    warning: 'mdx-infobox-warning',
    note: 'mdx-infobox-note',
  }

  return (
    <div className={`mdx-infobox ${typeClasses[type]}`}>
      <div className='mdx-infobox-header'>
        {icons[type]}
        {title && <span className='mdx-infobox-title'>{title}</span>}
      </div>
      <div className='mdx-infobox-content'>{children}</div>
    </div>
  )
}
