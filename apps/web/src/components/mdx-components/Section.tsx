import React from 'react'

interface SectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <section className={`mdx-section ${className}`}>
      {title && <h2 className='mdx-section-title'>{title}</h2>}
      <div className='mdx-section-content'>{children}</div>
    </section>
  )
}
