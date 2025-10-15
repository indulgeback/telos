import React from 'react'
import Image from 'next/image'

interface BlogImageProps {
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
  priority?: boolean
}

export function BlogImage({
  src,
  alt,
  caption,
  width = 1200,
  height = 675,
  priority = false,
}: BlogImageProps) {
  return (
    <figure className='mdx-blog-image'>
      <div className='mdx-blog-image-wrapper'>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className='mdx-blog-image-img'
          style={{
            width: '100%',
            height: 'auto',
          }}
        />
      </div>
      {caption && (
        <figcaption className='mdx-blog-image-caption'>{caption}</figcaption>
      )}
    </figure>
  )
}
