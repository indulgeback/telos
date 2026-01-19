/**
 * Showcase Data
 * Customer success stories and case studies
 */

export interface ShowcaseStory {
  id: string
  company: string
  logo?: string
  industry: string
  headline: string
  story: string
  challenges: string[]
  solutions: string[]
  results: {
    metric: string
    value: string
    description: string
  }[]
  testimonial: {
    quote: string
    author: string
    role: string
    avatar: string
  }
  tags: string[]
  readTime: string
}

export const showcaseStories: ShowcaseStory[] = [
  {
    id: 'techflow',
    company: 'TechFlow Inc.',
    industry: 'Technology',
    headline: 'Scaling from 10 to 1000 Workflows in 6 Months',
    story:
      'TechFlow Inc., a rapidly growing SaaS company, faced significant challenges with manual processes as they scaled. Their engineering team was drowning in repetitive tasks, from deployment notifications to incident response coordination.',
    challenges: [
      'Manual deployment notifications taking 2+ hours daily',
      'Incident response coordination was chaotic and slow',
      'No visibility into workflow bottlenecks',
      'Engineering team spending 40% time on manual tasks',
    ],
    solutions: [
      'Automated deployment notifications across Slack and email',
      'AI-powered incident triage and team routing',
      'Custom workflow templates for common operations',
      'Analytics dashboard for workflow optimization',
    ],
    results: [
      {
        metric: '300%',
        value: '+300%',
        description: 'Efficiency improvement in operations',
      },
      {
        metric: '15hrs',
        value: '-15hrs/week',
        description: 'Time saved on manual tasks',
      },
      {
        metric: '50%',
        value: '-50%',
        description: 'Faster incident response time',
      },
      {
        metric: '1000',
        value: '1000+',
        description: 'Active workflows running',
      },
    ],
    testimonial: {
      quote:
        'Telos transformed our workflow automation. The AI Agent decision-making capabilities are truly remarkable. We saw ROI within the first month.',
      author: 'Sarah Chen',
      role: 'CTO',
      avatar: '0018cb67627502233334ececcd398c4e.webp',
    },
    tags: ['saas', 'devops', 'automation', 'incident-management'],
    readTime: '5 min',
  },
  {
    id: 'dataflow',
    company: 'DataFlow Systems',
    industry: 'Financial Services',
    headline: 'Automating Compliance and Data Processing',
    story:
      'DataFlow Systems, a mid-sized financial services firm, needed to maintain strict compliance while processing thousands of transactions daily. Their manual compliance checks were becoming a bottleneck.',
    challenges: [
      'Manual compliance checks taking 3+ days per batch',
      'High error rate in data entry (8%)',
      'No audit trail for compliance audits',
      'Staff overwhelmed during peak periods',
    ],
    solutions: [
      'Automated compliance validation workflows',
      'AI-powered data extraction and validation',
      'Complete audit trail for every transaction',
      'Auto-scaling workflows for peak periods',
    ],
    results: [
      {
        metric: '80%',
        value: '-80%',
        description: 'Reduction in manual tasks',
      },
      {
        metric: '99.9%',
        value: '99.9%',
        description: 'Compliance accuracy rate',
      },
      {
        metric: '3days',
        value: '3days → 2hrs',
        description: 'Compliance check time',
      },
      {
        metric: '8%',
        value: '8% → 0.2%',
        description: 'Error rate reduction',
      },
    ],
    testimonial: {
      quote:
        'Finally, a platform that actually delivers on AI-driven orchestration. Our compliance team can now focus on strategic initiatives instead of manual checks.',
      author: 'Michael Schmidt',
      role: 'VP of Engineering',
      avatar: '06d29f74c2f85239efe3f9ade1b96da7.webp',
    },
    tags: ['finance', 'compliance', 'automation', 'data-processing'],
    readTime: '6 min',
  },
  {
    id: 'nexus',
    company: 'Nexus Tech',
    industry: 'E-commerce',
    headline: 'Multi-Channel Inventory Synchronization',
    story:
      'Nexus Tech, a rapidly growing e-commerce brand, was selling across 5+ platforms but struggled with inventory synchronization. Overselling and stockouts were costing them revenue and customer trust.',
    challenges: [
      'Overselling due to inventory sync delays',
      'Manual inventory updates across platforms',
      'Lost revenue from stockouts on popular items',
      'Customer complaints from cancelled orders',
    ],
    solutions: [
      'Real-time inventory sync across all platforms',
      'Automated reorder alerts based on predictive analytics',
      'Central inventory management dashboard',
      'Automatic stock level updates every 30 seconds',
    ],
    results: [
      {
        metric: '95%',
        value: '-95%',
        description: 'Reduction in overselling incidents',
      },
      {
        metric: '$120K',
        value: '+$120K',
        description: 'Annual revenue recovery',
      },
      {
        metric: '30sec',
        value: '30sec',
        description: 'Inventory sync time',
      },
      {
        metric: '40%',
        value: '-40%',
        description: 'Fewer customer complaints',
      },
    ],
    testimonial: {
      quote:
        'The visual workflow builder is incredible. What used to take days now takes hours. Our inventory is finally in sync across all channels.',
      author: 'Yuki Tanaka',
      role: 'Product Manager',
      avatar: '098d5b19a0870d95bee0cdbcef632be1.webp',
    },
    tags: ['ecommerce', 'inventory', 'integration', 'sync'],
    readTime: '4 min',
  },
  {
    id: 'cloudscale',
    company: 'CloudScale Solutions',
    industry: 'Cloud Infrastructure',
    headline: 'Automating Customer Onboarding at Scale',
    story:
      'CloudScale Solutions, a cloud infrastructure provider, needed to onboard hundreds of new customers weekly. Their manual onboarding process was causing delays and poor first impressions.',
    challenges: [
      'Manual account provisioning taking 2+ days',
      'Inconsistent onboarding experience',
      'High churn in first 30 days',
      'Support team overwhelmed with setup questions',
    ],
    solutions: [
      'Automated account provisioning workflows',
      'Self-service onboarding with guided workflows',
      'Automated welcome email sequences',
      'Progressive disclosure based on user actions',
    ],
    results: [
      {
        metric: '2days',
        value: '2days → 10min',
        description: 'Time to activate account',
      },
      {
        metric: '35%',
        value: '-35%',
        description: 'Reduction in early churn',
      },
      {
        metric: '60%',
        value: '-60%',
        description: 'Setup-related support tickets',
      },
      {
        metric: '92%',
        value: '92%',
        description: 'Customer satisfaction (NPS)',
      },
    ],
    testimonial: {
      quote:
        'We evaluated 5 different platforms before choosing Telos. The combination of power and ease of use is unmatched.',
      author: 'Emma Rodriguez',
      role: 'Operations Director',
      avatar: '119d9abaee7a1e987571f0fe776bd1a5.webp',
    },
    tags: ['saas', 'onboarding', 'automation', 'customer-success'],
    readTime: '5 min',
  },
  {
    id: 'startuphub',
    company: 'StartupHub',
    industry: 'Marketing Technology',
    headline: 'Content Publishing Across 10+ Channels',
    story:
      'StartupHub, a marketing automation platform, needed to publish content across multiple social media channels, blogs, and newsletters. Their team was spending hours on manual posting.',
    challenges: [
      'Manual posting to 10+ channels',
      'Inconsistent publishing schedules',
      'No unified content calendar',
      'Team spending 20+ hours weekly on publishing',
    ],
    solutions: [
      'Automated cross-platform publishing',
      'Unified content calendar with scheduling',
      'AI-powered content optimization per platform',
      'Automated performance reporting',
    ],
    results: [
      {
        metric: '20hrs',
        value: '-20hrs',
        description: 'Weekly time saved',
      },
      {
        metric: '3x',
        value: '3x',
        description: 'Increase in content output',
      },
      {
        metric: '45%',
        value: '+45%',
        description: 'Increase in engagement',
      },
      {
        metric: '100%',
        value: '100%',
        description: 'Publishing consistency',
      },
    ],
    testimonial: {
      quote:
        'Telos helped us scale from 10 to 100 automated workflows in just 3 months. The ROI was visible from week one.',
      author: 'James Wilson',
      role: 'Founder & CEO',
      avatar: '15a47b540d67ad8da5acfdf83964e08b.webp',
    },
    tags: ['marketing', 'content', 'social-media', 'automation'],
    readTime: '4 min',
  },
  {
    id: 'innovate-labs',
    company: 'Innovate Labs',
    industry: 'Software Development',
    headline: 'Global Team Workflow Collaboration',
    story:
      'Innovate Labs, a distributed software company with teams across 12 time zones, struggled with coordinating workflows and maintaining consistency across regions.',
    challenges: [
      'Inconsistent workflows across regions',
      'Language barriers in documentation',
      'Difficulty tracking global projects',
      'Manual status reporting across time zones',
    ],
    solutions: [
      'Multi-language workflow templates',
      'Automated status reporting with local time zones',
      'Centralized workflow governance',
      'Real-time collaboration across regions',
    ],
    results: [
      {
        metric: '100%',
        value: '100%',
        description: 'Workflow consistency globally',
      },
      {
        metric: '12',
        value: '12',
        description: 'Languages supported natively',
      },
      {
        metric: '8hrs',
        value: '-8hrs/week',
        description: 'Time saved on status meetings',
      },
      {
        metric: '50%',
        value: '+50%',
        description: 'Faster project delivery',
      },
    ],
    testimonial: {
      quote:
        'The multi-language support is fantastic. Our global teams can collaborate on workflows seamlessly.',
      author: 'Priya Sharma',
      role: 'Technical Lead',
      avatar: '17c21fc15d4f9bee986197c1a4cc3a14.webp',
    },
    tags: ['distributed-team', 'collaboration', 'multi-language', 'governance'],
    readTime: '6 min',
  },
]

export const showcaseIndustries = [
  { id: 'all', name: 'All Industries' },
  { id: 'Technology', name: 'Technology' },
  { id: 'Financial Services', name: 'Financial Services' },
  { id: 'E-commerce', name: 'E-commerce' },
  { id: 'Cloud Infrastructure', name: 'Cloud Infrastructure' },
  { id: 'Marketing Technology', name: 'Marketing Technology' },
  { id: 'Software Development', name: 'Software Development' },
]

export const showcaseTags = [
  'saas',
  'devops',
  'automation',
  'incident-management',
  'finance',
  'compliance',
  'data-processing',
  'ecommerce',
  'inventory',
  'integration',
  'sync',
  'onboarding',
  'customer-success',
  'marketing',
  'content',
  'social-media',
  'distributed-team',
  'collaboration',
  'multi-language',
  'governance',
]
