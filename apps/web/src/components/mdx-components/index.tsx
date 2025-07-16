import type { MDXComponents } from 'mdx/types'
import { Button } from '@/components/atoms'
import { LottieAnimation } from '@/components/molecules'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Button,
    LottieAnimation,
  }
}
