declare module '*.mdx' {
  import type { ComponentType } from 'react'

  export interface MDXMetadata {
    title: string
    description: string
    author: string
    authorBio: string
    date: string
    readTime: string
    tags: string[]
    coverImage?: string
  }

  export const metadata: MDXMetadata
  const Component: ComponentType
  export default Component
}
