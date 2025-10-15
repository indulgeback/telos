import React from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'

interface AuthorInfoProps {
  name: string
  avatar?: string
  bio?: string
  date?: string
  readTime?: string
}

export function AuthorInfo({
  name,
  avatar,
  bio,
  date,
  readTime,
}: AuthorInfoProps) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className='mdx-author-info'>
      <div className='mdx-author-avatar'>
        {avatar ? (
          <Image
            src={avatar}
            alt={name}
            width={64}
            height={64}
            className='mdx-author-avatar-img'
          />
        ) : (
          <div className='mdx-author-avatar-placeholder'>
            <User />
          </div>
        )}
      </div>
      <div className='mdx-author-details'>
        <div className='mdx-author-name'>{name}</div>
        {bio && <div className='mdx-author-bio'>{bio}</div>}
        {(formattedDate || readTime) && (
          <div className='mdx-author-meta'>
            {formattedDate && <span>{formattedDate}</span>}
            {formattedDate && readTime && (
              <span className='mdx-author-meta-separator'>•</span>
            )}
            {readTime && <span>{readTime}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
