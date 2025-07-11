import type { MetadataRoute } from 'next'

const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://www.yunjia.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/private/',
    },
    sitemap: `${domain}/sitemap.xml`,
  }
}
