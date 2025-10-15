import type { MDXComponents } from 'mdx/types'
import { Button } from '@/components/atoms'
import { LottieAnimation } from '@/components/molecules'
import { Section } from './Section'
import { InfoBox } from './InfoBox'
import { LastUpdated } from './LastUpdated'
import { BlogCard } from './BlogCard'
import { AuthorInfo } from './AuthorInfo'
import { BlogImage } from './BlogImage'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Button,
    LottieAnimation,
    Section,
    InfoBox,
    LastUpdated,
    BlogCard,
    AuthorInfo,
    BlogImage,
  }
}
