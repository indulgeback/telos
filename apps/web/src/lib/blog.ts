// 静态导入所有博客文章（Turbopack 不支持动态导入）
import * as gettingStarted from '@/content/blog/getting-started-with-workflow-automation.mdx'
import * as buildingMicroservices from '@/content/blog/building-scalable-microservices.mdx'
import * as securityBestPractices from '@/content/blog/security-best-practices.mdx'
import * as apiGateway from '@/content/blog/introducing-new-api-gateway.mdx'
import * as workflowPerformance from '@/content/blog/optimizing-workflow-performance.mdx'
import * as caseStudy from '@/content/blog/case-study-company-x-devops.mdx'

export interface BlogPost {
  slug: string
  title: string
  description: string
  author: string
  authorBio: string
  date: string
  readTime: string
  tags: string[]
  coverImage?: string
}

// 博客文章映射表
const BLOG_POST_MODULES = {
  'getting-started-with-workflow-automation': gettingStarted,
  'building-scalable-microservices': buildingMicroservices,
  'security-best-practices': securityBestPractices,
  'introducing-new-api-gateway': apiGateway,
  'optimizing-workflow-performance': workflowPerformance,
  'case-study-company-x-devops': caseStudy,
} as const

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts: BlogPost[] = []

  for (const [slug, module] of Object.entries(BLOG_POST_MODULES)) {
    try {
      if (module.metadata) {
        posts.push({
          slug,
          ...module.metadata,
        })
      }
    } catch (error) {
      console.error(`Failed to load blog post: ${slug}`, error)
    }
  }

  // 按日期排序（最新的在前）
  return posts.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

export async function getBlogPost(slug: string) {
  const postModule = BLOG_POST_MODULES[slug as keyof typeof BLOG_POST_MODULES]
  if (!postModule) {
    return null
  }

  return {
    slug,
    metadata: postModule.metadata,
    content: postModule.default,
  }
}

export function getBlogSlugs() {
  return Object.keys(BLOG_POST_MODULES)
}
