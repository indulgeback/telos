import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'
import rehypePrismPlus from 'rehype-prism-plus'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
}

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    providerImportSource: '@/components/mdx-components',
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypePrismPlus],
  },
})

export default withMDX(withNextIntl(nextConfig))
