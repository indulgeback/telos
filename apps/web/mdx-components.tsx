import type { MDXComponents } from 'mdx/types'
import { useMDXComponents as getComponents } from '@/components/mdx-components'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return getComponents(components)
}
