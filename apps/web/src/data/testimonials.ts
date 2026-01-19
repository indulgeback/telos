/**
 * Testimonials Data
 * User testimonials with avatar filenames
 */

export interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  avatar: string // Filename from /assets/images/images/avatar/
  quote: string
  rating?: number
  country?: string
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'TechFlow Inc.',
    avatar: '0018cb67627502233334ececcd398c4e.webp',
    quote:
      'Telos transformed our workflow automation. We saw a 300% efficiency boost within the first month. The AI Agent decision-making capabilities are truly remarkable.',
    rating: 5,
    country: 'US',
  },
  {
    id: '2',
    name: 'Michael Schmidt',
    role: 'VP of Engineering',
    company: 'DataFlow Systems',
    avatar: '06d29f74c2f85239efe3f9ade1b96da7.webp',
    quote:
      'Finally, a platform that actually delivers on AI-driven orchestration. Our team reduced manual tasks by 80% and can now focus on strategic initiatives.',
    rating: 5,
    country: 'DE',
  },
  {
    id: '3',
    name: 'Yuki Tanaka',
    role: 'Product Manager',
    company: 'Nexus Tech',
    avatar: '098d5b19a0870d95bee0cdbcef632be1.webp',
    quote:
      'The visual workflow builder is incredible. What used to take days now takes hours. Telos is a game-changer for product teams.',
    rating: 5,
    country: 'JP',
  },
  {
    id: '4',
    name: 'Emma Rodriguez',
    role: 'Operations Director',
    company: 'CloudScale Solutions',
    avatar: '119d9abaee7a1e987571f0fe776bd1a5.webp',
    quote:
      'We evaluated 5 different platforms before choosing Telos. The combination of power and ease of use is unmatched.',
    rating: 5,
    country: 'ES',
  },
  {
    id: '5',
    name: 'James Wilson',
    role: 'Founder & CEO',
    company: 'StartupHub',
    avatar: '15a47b540d67ad8da5acfdf83964e08b.webp',
    quote:
      'Telos helped us scale from 10 to 100 automated workflows in just 3 months. The ROI was visible from week one.',
    rating: 5,
    country: 'UK',
  },
  {
    id: '6',
    name: 'Priya Sharma',
    role: 'Technical Lead',
    company: 'Innovate Labs',
    avatar: '17c21fc15d4f9bee986197c1a4cc3a14.webp',
    quote:
      'The multi-language support is fantastic. Our global teams can collaborate on workflows seamlessly. Telos truly understands international business.',
    rating: 5,
    country: 'IN',
  },
  {
    id: '7',
    name: 'Alexandre Dubois',
    role: 'DevOps Engineer',
    company: 'TechCorp France',
    avatar: '1a270860bac2c66b434968a3047822e3.webp',
    quote:
      'Integration with our existing tools was smooth. The API is well-documented and the support team is incredibly responsive.',
    rating: 4,
    country: 'FR',
  },
  {
    id: '8',
    name: 'Olivia Thompson',
    role: 'Head of Operations',
    company: 'Streamline Inc.',
    avatar: '1a3318330cf1734feb84887e9453fb1b.webp',
    quote:
      'The analytics dashboard gives us complete visibility into our workflows. We can identify bottlenecks instantly and optimize continuously.',
    rating: 5,
    country: 'AU',
  },
  {
    id: '9',
    name: 'David Kim',
    role: 'Engineering Manager',
    company: 'FutureWorks',
    avatar: '1bab427466457e745328f6eb8fa227e1.webp',
    quote:
      'We saved over 2000 hours in the first quarter alone. The AI-powered suggestions are surprisingly accurate and helpful.',
    rating: 5,
    country: 'CA',
  },
  {
    id: '10',
    name: 'Anna Bergström',
    role: 'CTO',
    company: 'Nordic Tech',
    avatar: '1c9a4dd0bbd964e3eecbd40caf3b7e37.webp',
    quote:
      'Telos strikes the perfect balance between power and simplicity. Our non-technical team members can build complex workflows easily.',
    rating: 5,
    country: 'SE',
  },
  {
    id: '11',
    name: 'Roberto Silva',
    role: 'Digital Transformation Lead',
    company: 'BrazilTech',
    avatar: '1cee4e042d482afdcdd2af1111c9988d.webp',
    quote:
      "The 99.9% uptime is no exaggeration. We've been running critical workflows for 8 months without a single issue.",
    rating: 5,
    country: 'BR',
  },
  {
    id: '12',
    name: 'Jennifer Lee',
    role: 'Product Owner',
    company: 'Agile Solutions',
    avatar: '1dd1b479633b29ff2fd9d6644581f394.webp',
    quote:
      "Best investment we've made this year. The platform pays for itself many times over in productivity gains.",
    rating: 5,
    country: 'SG',
  },
]

// Helper function to get full avatar URL
export function getAvatarUrl(filename: string): string {
  return `/assets/images/images/avatar/${filename}`
}
