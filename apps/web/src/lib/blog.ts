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

const BLOG_POSTS = [
  'getting-started-with-workflow-automation',
  'building-scalable-microservices',
  'security-best-practices',
  'introducing-new-api-gateway',
  'optimizing-workflow-performance',
  'case-study-company-x-devops',
] as const

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts: BlogPost[] = []

  for (const slug of BLOG_POSTS) {
    try {
      const postModule = await import(`@/content/blog/${slug}.mdx`)
      if (postModule.metadata) {
        posts.push({
          slug,
          ...postModule.metadata,
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
  try {
    const postModule = await import(`@/content/blog/${slug}.mdx`)
    return {
      slug,
      metadata: postModule.metadata,
      content: postModule.default,
    }
  } catch (error) {
    return null
  }
}

export function getBlogSlugs() {
  return BLOG_POSTS
}
