'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import type { Components } from 'react-markdown'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const components: Components = {
    pre: ({ children, className, ...props }) => (
      <pre
        className='bg-muted rounded-lg p-4 overflow-x-auto text-sm'
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
          className='bg-muted px-1.5 py-0.5 rounded text-sm font-mono'
          {...props}
        >
          {children}
        </code>
      )
    },
    p: ({ children, ...props }) => (
      <p className='mb-4 last:mb-0' {...props}>
        {children}
      </p>
    ),
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
      <a
        className='text-primary hover:underline'
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        {...props}
      >
        {children}
      </a>
    ),
    table: ({ children, ...props }) => (
      <div className='overflow-x-auto mb-4'>
        <table className='min-w-full border-collapse' {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className='bg-muted' {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => (
      <tr className='border-b border-border' {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th className='px-4 py-2 text-left font-semibold' {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className='px-4 py-2' {...props}>
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

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
