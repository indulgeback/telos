import { notFound } from 'next/navigation'
import { MDXProseProvider } from '@/components/providers'

// 博客文章列表
const BLOG_POSTS = [
  'getting-started-with-workflow-automation',
  'building-scalable-microservices',
  'security-best-practices',
  'introducing-new-api-gateway',
  'optimizing-workflow-performance',
  'case-study-company-x-devops',
]

interface BlogPostPageProps {
  params: {
    slug: string
    locale: string
  }
}

// 生成静态路径
export async function generateStaticParams() {
  return BLOG_POSTS.map(slug => ({
    slug,
  }))
}

// 动态导入 MDX 文件
async function getMDXContent(slug: string) {
  try {
    const MDXContent = await import(`@/content/blog/${slug}.mdx`)
    return MDXContent
  } catch (error) {
    return null
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params

  // 检查文章是否存在
  if (!BLOG_POSTS.includes(slug)) {
    notFound()
  }

  // 动态导入 MDX 内容
  const MDXContent = await getMDXContent(slug)

  if (!MDXContent) {
    notFound()
  }

  const { default: Content } = MDXContent

  return (
    <MDXProseProvider>
      <Content />
    </MDXProseProvider>
  )
}

// 生成元数据
export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params

  const MDXContent = await getMDXContent(slug)

  if (!MDXContent) {
    return {
      title: 'Post Not Found',
    }
  }

  // 从 frontmatter 获取元数据
  const { metadata } = MDXContent

  return {
    title: metadata?.title || 'Blog Post',
    description: metadata?.description || '',
  }
}
