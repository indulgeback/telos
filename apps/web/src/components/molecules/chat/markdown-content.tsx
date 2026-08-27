'use client'

import React, { memo, type ReactElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import type { Components } from 'react-markdown'
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import { Download } from 'lucide-react'
import { ArtifactPreviewLink } from './artifact-preview-link'

interface MarkdownContentProps {
  content: string
}

const CustomZoomContent = ({
  buttonUnzoom,
  img,
}: {
  buttonUnzoom: ReactElement
  img: ReactElement | null
}) => {
  const imgElement = img as ReactElement<any> | null
  const src = imgElement?.props?.src

  const handleDownload = async () => {
    if (!src) return
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename =
        src.split('/').pop()?.split('?')[0] || 'generated-image.jpg'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const a = document.createElement('a')
      a.href = src
      a.target = '_blank'
      const filename =
        src.split('/').pop()?.split('?')[0] || 'generated-image.jpg'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <>
      {img}
      {src && (
        <button
          onClick={handleDownload}
          className='fixed top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-md transition-colors flex items-center justify-center cursor-pointer border border-white/10'
          title='下载图片'
          aria-label='下载图片'
        >
          <Download className='size-5' />
        </button>
      )}
    </>
  )
}

const MARKDOWN_COMPONENTS: Components = {
  img: ({ src, alt, ...props }) => (
    <Zoom ZoomContent={CustomZoomContent}>
      <img
        src={src}
        alt={alt}
        className='my-3 h-auto w-full max-w-[320px] cursor-zoom-in rounded-2xl border border-border/70 shadow-sm transition-all hover:shadow-md sm:max-w-[420px]'
        {...props}
      />
    </Zoom>
  ),
  pre: ({ children, className, ...props }) => (
    <pre
      className='my-4 overflow-x-auto rounded-xl border border-white/10 bg-[#17181a] p-4 font-mono text-[12px] leading-6 text-[#e7e8ea] shadow-sm'
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    return match ? (
      <code className={className} {...props}>
        {children}
      </code>
    ) : (
      <code
        className='rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-accent-foreground'
        {...props}
      >
        {children}
      </code>
    )
  },
  p: ({ children, ...props }) => {
    const childrenArray = React.Children.toArray(children)
    const hasImage = childrenArray.some(
      (child: any) =>
        child?.type === 'img' ||
        child?.props?.src ||
        child?.type?.name === 'img' ||
        (typeof child?.type === 'function' && child?.type?.name === 'img')
    )

    if (hasImage) {
      return (
        <div className='mb-4 last:mb-0' {...props}>
          {children}
        </div>
      )
    }

    return (
      <p className='mb-4 last:mb-0' {...props}>
        {children}
      </p>
    )
  },
  h1: ({ children, ...props }) => (
    <h1 className='text-xl font-bold mb-4 mt-6 first:mt-0' {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className='text-lg font-bold mb-3 mt-5 first:mt-0' {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className='text-base font-semibold mb-2 mt-4 first:mt-0' {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className='text-sm font-semibold mb-2 mt-3 first:mt-0' {...props}>
      {children}
    </h4>
  ),
  ul: ({ children, ...props }) => (
    <ul className='list-disc list-inside mb-4 space-y-1' {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className='list-decimal list-inside mb-4 space-y-1' {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className='ml-4' {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className='border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-4'
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: props => <hr className='my-4 border-border' {...props} />,
  a: ({ children, href, ...props }) => (
    <ArtifactPreviewLink
      className='text-primary hover:underline'
      href={href || '#'}
      {...props}
    >
      {children}
    </ArtifactPreviewLink>
  ),
  table: ({ children, ...props }) => (
    <div className='mb-4 overflow-x-auto rounded-xl border border-border bg-card'>
      <table className='min-w-full border-collapse text-[13px]' {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      className='bg-muted font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground'
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => (
    <tr className='border-b border-border last:border-b-0' {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className='px-4 py-2.5 text-left font-medium' {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className='px-4 py-2.5' {...props}>
      {children}
    </td>
  ),
  strong: ({ children, ...props }) => (
    <strong className='font-semibold' {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className='italic' {...props}>
      {children}
    </em>
  ),
}

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeHighlight]

export const MarkdownContent = memo(function MarkdownContent({
  content,
}: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  )
})
MarkdownContent.displayName = 'MarkdownContent'
