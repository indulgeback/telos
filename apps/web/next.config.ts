import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'
import rehypePrismPlus from 'rehype-prism-plus'
import { codeInspectorPlugin } from 'code-inspector-plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  reactStrictMode: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  output: 'standalone', // 支持 Docker 部署
  compress: true,
  trailingSlash: true,
  compiler: {
    removeConsole: {
      exclude:
        process.env.NEXT_PUBLIC_NODE_ENV === 'dev'
          ? ['log', 'warn', 'error']
          : ['warn', 'error'],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.plugins.push(
        codeInspectorPlugin({
          bundler: 'webpack',
        })
      )
    }
    return config
  },
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
