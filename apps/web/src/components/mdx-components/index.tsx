import type { MDXComponents } from 'mdx/types'
import { Button } from '@/components/atoms'
import { LottieAnimation } from '@/components/molecules'
import { Section } from './Section'
import { InfoBox } from './InfoBox'
import { LastUpdated } from './LastUpdated'
import { BlogCard } from './BlogCard'
import { AuthorInfo } from './AuthorInfo'
import { BlogImage } from './BlogImage'
import { CodeBlock } from './CodeBlock'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from './Table'

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
    code: CodeBlock,
    table: Table,
    thead: TableHead,
    tbody: TableBody,
    tr: TableRow,
    td: TableCell,
    th: TableHeader,
  }
}
