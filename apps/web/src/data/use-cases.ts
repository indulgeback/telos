/**
 * Use Cases Data
 * Real-world use case examples and implementations
 */

export interface UseCase {
  id: string
  name: string
  description: string
  industry: string
  category: 'automation' | 'integration' | 'ai' | 'data' | 'workflow'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  timeSaved: string // e.g., "10 hours/week"
  icon: string
  tags: string[]
  benefits: string[]
  tools: string[]
}

export const useCases: UseCase[] = [
  {
    id: 'lead-enrichment',
    name: 'Automated Lead Enrichment',
    description:
      'Automatically enrich incoming leads with data from multiple sources, score them, and route to sales teams.',
    industry: 'Sales & Marketing',
    category: 'automation',
    difficulty: 'intermediate',
    timeSaved: '15 hours/week',
    icon: 'Users',
    tags: ['lead-generation', 'sales', 'automation', 'crm'],
    benefits: [
      'Faster response times to new leads',
      'Improved lead quality scoring',
      'Automatic data enrichment from 3+ sources',
      'Smart routing to sales reps',
    ],
    tools: ['HubSpot', 'Clearbit', 'Slack', 'Email'],
  },
  {
    id: 'customer-support-triage',
    name: 'AI-Powered Support Triage',
    description:
      'Use AI to categorize, prioritize, and route customer support tickets automatically.',
    industry: 'Customer Support',
    category: 'ai',
    difficulty: 'intermediate',
    timeSaved: '20 hours/week',
    icon: 'MessageSquare',
    tags: ['support', 'ai', 'triage', 'automation'],
    benefits: [
      '30% faster response times',
      'Consistent ticket categorization',
      'Auto-responses for common queries',
      'Priority customer detection',
    ],
    tools: ['Zendesk', 'OpenAI GPT', 'Slack', 'Salesforce'],
  },
  {
    id: 'social-media-monitoring',
    name: 'Social Media Sentiment Monitor',
    description:
      'Monitor brand mentions across platforms, analyze sentiment, and alert teams to important conversations.',
    industry: 'Marketing',
    category: 'ai',
    difficulty: 'advanced',
    timeSaved: '12 hours/week',
    icon: 'TrendingUp',
    tags: ['social-media', 'monitoring', 'sentiment', 'alerts'],
    benefits: [
      'Real-time brand monitoring',
      'Sentiment trend analysis',
      'Crisis detection and alerts',
      'Competitor tracking',
    ],
    tools: ['Twitter API', 'Reddit API', 'Sentiment API', 'Slack'],
  },
  {
    id: 'invoice-processing',
    name: 'Automated Invoice Processing',
    description:
      'Extract data from invoices, validate against purchase orders, and update accounting systems.',
    industry: 'Finance',
    category: 'automation',
    difficulty: 'advanced',
    timeSaved: '25 hours/week',
    icon: 'FileText',
    tags: ['finance', 'invoice', 'ocr', 'accounting'],
    benefits: [
      '90% faster invoice processing',
      'Reduced data entry errors',
      'Automatic approval workflows',
      'ERP integration',
    ],
    tools: ['Email', 'OCR API', 'QuickBooks', 'Slack'],
  },
  {
    id: 'employee-onboarding',
    name: 'Employee Onboarding Flow',
    description:
      'Automate the entire employee onboarding process from offer letter to first-day setup.',
    industry: 'HR',
    category: 'workflow',
    difficulty: 'intermediate',
    timeSaved: '8 hours/employee',
    icon: 'UserPlus',
    tags: ['hr', 'onboarding', 'workflow', 'automation'],
    benefits: [
      'Consistent onboarding experience',
      'Automatic account provisioning',
      'Document tracking',
      'Task assignment automation',
    ],
    tools: ['Notion', 'Slack', 'Google Workspace', 'Jira'],
  },
  {
    id: 'ecommerce-inventory-sync',
    name: 'Multi-Channel Inventory Sync',
    description:
      'Synchronize inventory levels across multiple e-commerce platforms in real-time.',
    industry: 'E-commerce',
    category: 'integration',
    difficulty: 'advanced',
    timeSaved: '18 hours/week',
    icon: 'Package',
    tags: ['ecommerce', 'inventory', 'sync', 'integration'],
    benefits: [
      'Prevent overselling',
      'Real-time stock updates',
      'Multi-platform consistency',
      'Automatic reorder alerts',
    ],
    tools: ['Shopify', 'WooCommerce', 'Amazon', 'PostgreSQL'],
  },
  {
    id: 'dev-incident-response',
    name: 'DevOps Incident Response',
    description:
      'Automate incident detection, notification, and response coordination for DevOps teams.',
    industry: 'DevOps',
    category: 'automation',
    difficulty: 'advanced',
    timeSaved: '10 hours/incident',
    icon: 'AlertTriangle',
    tags: ['devops', 'incident', 'monitoring', 'alerts'],
    benefits: [
      'Faster incident detection',
      'Automatic team notifications',
      'Runbook automation',
      'Post-incident reporting',
    ],
    tools: ['Datadog', 'PagerDuty', 'Slack', 'Jira', 'GitHub'],
  },
  {
    id: 'content-calendar-automation',
    name: 'Content Publishing Automation',
    description:
      'Schedule and publish content across multiple channels from a single content calendar.',
    industry: 'Marketing',
    category: 'workflow',
    difficulty: 'beginner',
    timeSaved: '6 hours/week',
    icon: 'Calendar',
    tags: ['content', 'social-media', 'scheduling', 'automation'],
    benefits: [
      'Consistent publishing schedule',
      'Multi-platform publishing',
      'Content calendar visibility',
      'Automated cross-posting',
    ],
    tools: ['Notion', 'Twitter API', 'LinkedIn API', 'Buffer'],
  },
  {
    id: 'data-backup-automation',
    name: 'Automated Backup & Recovery',
    description:
      'Schedule and automate backups across multiple databases and cloud storage with monitoring.',
    industry: 'IT Operations',
    category: 'data',
    difficulty: 'intermediate',
    timeSaved: '12 hours/week',
    icon: 'Database',
    tags: ['backup', 'database', 'automation', 'monitoring'],
    benefits: [
      'Automated backup schedules',
      'Failure notifications',
      'Cross-region replication',
      'Recovery testing',
    ],
    tools: ['PostgreSQL', 'AWS S3', 'Slack', 'Email'],
  },
  {
    id: 'expense-report-automation',
    name: 'Expense Report Processing',
    description:
      'Automatically collect, categorize, and approve employee expense reports.',
    industry: 'Finance',
    category: 'automation',
    difficulty: 'intermediate',
    timeSaved: '8 hours/week',
    icon: 'Receipt',
    tags: ['finance', 'expense', 'automation', 'approval'],
    benefits: [
      'Faster reimbursement cycles',
      'Automatic policy checking',
      'Receipt OCR processing',
      'Manager notification',
    ],
    tools: ['Email', 'OCR API', 'Slack', 'QuickBooks'],
  },
  {
    id: 'project-status-reporting',
    name: 'Automated Project Status Reports',
    description:
      'Generate and distribute project status reports from multiple data sources automatically.',
    industry: 'Project Management',
    category: 'workflow',
    difficulty: 'beginner',
    timeSaved: '5 hours/week',
    icon: 'BarChart',
    tags: ['reporting', 'project-management', 'automation', 'email'],
    benefits: [
      'Consistent report formatting',
      'Automatic data collection',
      'Scheduled distribution',
      'Historical tracking',
    ],
    tools: ['Jira', 'Notion', 'Email', 'Slack'],
  },
  {
    id: 'api-data-pipeline',
    name: 'API Data Pipeline',
    description:
      'Build automated data pipelines that fetch, transform, and load data from multiple APIs.',
    industry: 'Data Engineering',
    category: 'data',
    difficulty: 'advanced',
    timeSaved: '20 hours/week',
    icon: 'GitBranch',
    tags: ['api', 'etl', 'data-pipeline', 'integration'],
    benefits: [
      'Automated data sync',
      'Data transformation',
      'Error handling & retry',
      'Monitoring & alerts',
    ],
    tools: ['HTTP API', 'PostgreSQL', 'MongoDB', 'S3', 'Slack'],
  },
]

export const useCaseIndustries = [
  { id: 'all', name: 'All Industries', icon: 'Grid3x3' },
  { id: 'Sales & Marketing', name: 'Sales & Marketing', icon: 'TrendingUp' },
  { id: 'Customer Support', name: 'Customer Support', icon: 'Headphones' },
  { id: 'Finance', name: 'Finance', icon: 'DollarSign' },
  { id: 'HR', name: 'Human Resources', icon: 'Users' },
  { id: 'E-commerce', name: 'E-commerce', icon: 'ShoppingCart' },
  { id: 'DevOps', name: 'DevOps', icon: 'Server' },
  { id: 'IT Operations', name: 'IT Operations', icon: 'Settings' },
  { id: 'Project Management', name: 'Project Management', icon: 'Kanban' },
  { id: 'Data Engineering', name: 'Data Engineering', icon: 'Database' },
]

export const useCaseCategories = [
  { id: 'automation', name: 'Automation', icon: 'Zap' },
  { id: 'integration', name: 'Integration', icon: 'Puzzle' },
  { id: 'ai', name: 'AI-Powered', icon: 'Sparkles' },
  { id: 'data', name: 'Data Management', icon: 'Database' },
  { id: 'workflow', name: 'Workflow', icon: 'GitBranch' },
]
