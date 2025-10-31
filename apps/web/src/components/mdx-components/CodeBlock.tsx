'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const codeString = String(children).replace(/\n$/, '')

  return language ? (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      PreTag='div'
      customStyle={{
        margin: '1.5rem 0',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
      }}
      {...props}
    >
      {codeString}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  )
}
