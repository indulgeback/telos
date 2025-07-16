import type { MDXComponents } from 'mdx/types'
import { Button } from '@/components/atoms'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Button,
  }
}
