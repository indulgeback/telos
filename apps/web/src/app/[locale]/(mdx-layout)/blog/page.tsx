import { getAllBlogPosts } from '@/lib/blog'
import { BlogCard } from '@/components/mdx-components/BlogCard'

export const metadata = {
  title: 'Blog',
  description: 'Telos Blog - Latest news, updates, and insights',
}

export default async function BlogPage() {
  const posts = await getAllBlogPosts()

  return (
    <div className='mdx-prose'>
      <h1>Blog</h1>

      <p>
        Welcome to the Telos blog. Here you'll find the latest updates,
        technical insights, tutorials, and news about our platform.
      </p>

      <div className='mdx-infobox mdx-infobox-info'>
        <div className='mdx-infobox-header'>
          <span className='mdx-infobox-title'>Stay Updated</span>
        </div>
        <div className='mdx-infobox-content'>
          Subscribe to our newsletter to get the latest blog posts delivered
          directly to your inbox.
        </div>
      </div>

      <h2>Latest Posts</h2>

      <div className='mdx-blog-grid'>
        {posts.map(post => (
          <BlogCard
            key={post.slug}
            title={post.title}
            excerpt={post.description}
            date={post.date}
            readTime={post.readTime}
            slug={post.slug}
            coverImage={post.coverImage}
            tags={post.tags}
          />
        ))}
      </div>

      <hr
        style={{
          margin: '3rem 0',
          border: 'none',
          borderTop: '1px solid #e2e8f0',
        }}
      />

      <h2>Categories</h2>

      <p>Browse posts by category:</p>

      <ul>
        <li>
          <strong>Tutorials</strong> - Step-by-step guides and how-tos
        </li>
        <li>
          <strong>Product Updates</strong> - Latest features and releases
        </li>
        <li>
          <strong>Best Practices</strong> - Tips and recommendations from our
          team
        </li>
        <li>
          <strong>Case Studies</strong> - Real-world success stories
        </li>
        <li>
          <strong>Architecture</strong> - Technical deep dives and design
          patterns
        </li>
        <li>
          <strong>Security</strong> - Security updates and best practices
        </li>
      </ul>

      <div className='mdx-infobox mdx-infobox-note'>
        <div className='mdx-infobox-content'>
          Have a topic you'd like us to cover? Send us your suggestions at
          blog@telos.com
        </div>
      </div>
    </div>
  )
}
