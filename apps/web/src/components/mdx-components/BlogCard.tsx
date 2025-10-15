import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'

interface BlogCardProps {
  title: string
  excerpt: string
  date: string
  readTime: string
  slug: string
  coverImage?: string
  tags?: string[]
}

export function BlogCard({
  title,
  excerpt,
  date,
  readTime,
  slug,
  coverImage,
  tags = [],
}: BlogCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link href={`/blog/${slug}`} className='mdx-blog-card'>
      <article className='mdx-blog-card-content'>
        {coverImage && (
          <div className='mdx-blog-card-cover'>
            <Image
              src={coverImage}
              alt={title}
              width={800}
              height={400}
              className='mdx-blog-card-cover-img'
              style={{
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        )}

        <div className='mdx-blog-card-body'>
          <h3 className='mdx-blog-card-title'>{title}</h3>
          <p className='mdx-blog-card-excerpt'>{excerpt}</p>

          <div className='mdx-blog-card-meta'>
            <div className='mdx-blog-card-meta-item'>
              <Calendar className='mdx-blog-card-icon' />
              <span>{formattedDate}</span>
            </div>
            <div className='mdx-blog-card-meta-item'>
              <Clock className='mdx-blog-card-icon' />
              <span>{readTime}</span>
            </div>
          </div>

          {tags.length > 0 && (
            <div className='mdx-blog-card-tags'>
              {tags.map(tag => (
                <span key={tag} className='mdx-blog-card-tag'>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
