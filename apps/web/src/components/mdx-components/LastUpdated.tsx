import React from 'react'
import { Calendar } from 'lucide-react'

interface LastUpdatedProps {
  date: string
}

export function LastUpdated({ date }: LastUpdatedProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className='mdx-last-updated'>
      <Calendar className='mdx-last-updated-icon' />
      <span className='mdx-last-updated-text'>
        Last updated: {formattedDate}
      </span>
    </div>
  )
}
