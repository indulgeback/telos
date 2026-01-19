/**
 * Integrations Data
 * Available third-party service integrations
 */

export interface Integration {
  id: string
  name: string
  description: string
  category:
    | 'communication'
    | 'development'
    | 'data'
    | 'productivity'
    | 'ai'
    | 'storage'
    | 'crm'
    | 'other'
  logo?: string // Icon name from lucide-react
  popular?: boolean
  beta?: boolean
  features: string[]
  setupTime?: string
}

export const integrations: Integration[] = [
  // Communication
  {
    id: 'slack',
    name: 'Slack',
    description:
      'Send messages, create channels, and manage team communication.',
    category: 'communication',
    logo: 'MessageSquare',
    popular: true,
    features: [
      'Send messages',
      'Create channels',
      'User management',
      'Webhooks',
    ],
    setupTime: '2 min',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Post messages and manage Discord servers automatically.',
    category: 'communication',
    logo: 'Gamepad2',
    features: ['Send messages', 'Server management', 'Webhook support'],
    setupTime: '3 min',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Send messages and manage Telegram bots.',
    category: 'communication',
    logo: 'Send',
    features: ['Send messages', 'Bot commands', 'File sharing'],
    setupTime: '2 min',
  },
  {
    id: 'email',
    name: 'Email (SMTP)',
    description: 'Send emails via any SMTP server.',
    category: 'communication',
    logo: 'Mail',
    popular: true,
    features: ['Send emails', 'Attachments', 'HTML support', 'Bulk sending'],
    setupTime: '5 min',
  },
  // Development
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repositories, issues, pull requests, and workflows.',
    category: 'development',
    logo: 'Github',
    popular: true,
    features: [
      'Create issues',
      'Manage PRs',
      'Repository webhooks',
      'Actions trigger',
    ],
    setupTime: '3 min',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Interact with GitLab projects, issues, and merge requests.',
    category: 'development',
    logo: 'GitBranch',
    features: [
      'Create issues',
      'Manage MRs',
      'Pipeline triggers',
      'Project management',
    ],
    setupTime: '4 min',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create and manage Jira tickets, update statuses.',
    category: 'development',
    logo: 'Tasks',
    popular: true,
    features: [
      'Create issues',
      'Update status',
      'Add comments',
      'Transition workflows',
    ],
    setupTime: '5 min',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Manage issues and projects in Linear.',
    category: 'development',
    logo: 'ArrowRight',
    beta: true,
    features: ['Create issues', 'Update status', 'Project management'],
    setupTime: '3 min',
  },
  // Data & Storage
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query, insert, and update data in PostgreSQL databases.',
    category: 'data',
    logo: 'Database',
    popular: true,
    features: [
      'Query data',
      'Insert records',
      'Update records',
      'Stored procedures',
    ],
    setupTime: '5 min',
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Connect and interact with MySQL databases.',
    category: 'data',
    logo: 'Database',
    features: ['Query data', 'Insert records', 'Update records'],
    setupTime: '5 min',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'Work with MongoDB collections and documents.',
    category: 'data',
    logo: 'Database',
    features: ['CRUD operations', 'Aggregation queries', 'Index management'],
    setupTime: '4 min',
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Cache data and manage Redis instances.',
    category: 'data',
    logo: 'DatabaseZap',
    features: ['Set/get values', 'Hash operations', 'Cache management'],
    setupTime: '3 min',
  },
  {
    id: 's3',
    name: 'AWS S3',
    description: 'Store and retrieve files in AWS S3 buckets.',
    category: 'storage',
    logo: 'HardDrive',
    features: [
      'Upload files',
      'Download files',
      'Bucket management',
      'Presigned URLs',
    ],
    setupTime: '8 min',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Manage files and folders in Google Drive.',
    category: 'storage',
    logo: 'Drive',
    features: ['Upload files', 'Create folders', 'Share files', 'Search files'],
    setupTime: '5 min',
  },
  // Productivity
  {
    id: 'notion',
    name: 'Notion',
    description: 'Create and update pages, databases in Notion.',
    category: 'productivity',
    logo: 'FileText',
    popular: true,
    features: [
      'Create pages',
      'Update databases',
      'Search content',
      'Page properties',
    ],
    setupTime: '4 min',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Work with Airtable bases and records.',
    category: 'productivity',
    logo: 'Table2',
    features: ['CRUD records', 'Query tables', 'Form submissions'],
    setupTime: '4 min',
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Manage Trello cards, lists, and boards.',
    category: 'productivity',
    logo: 'Trello',
    features: ['Create cards', 'Move cards', 'Add comments', 'Due dates'],
    setupTime: '5 min',
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Create tasks and manage projects in Asana.',
    category: 'productivity',
    logo: 'CheckCircle2',
    features: [
      'Create tasks',
      'Update status',
      'Add followers',
      'Project management',
    ],
    setupTime: '6 min',
  },
  // AI Services
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Use Claude AI for advanced language tasks.',
    category: 'ai',
    logo: 'Bot',
    popular: true,
    features: ['Text generation', 'Analysis', 'Code generation', 'Vision'],
    setupTime: '3 min',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'Access GPT-4 and other OpenAI models.',
    category: 'ai',
    logo: 'Sparkles',
    popular: true,
    features: [
      'Chat completion',
      'Function calling',
      'Embeddings',
      'Image generation',
    ],
    setupTime: '3 min',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Use thousands of ML models via Hugging Face API.',
    category: 'ai',
    logo: 'Cpu',
    beta: true,
    features: ['Inference API', 'Model hosting', 'Pipeline support'],
    setupTime: '5 min',
  },
  // CRM
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Manage leads, contacts, and opportunities in Salesforce.',
    category: 'crm',
    logo: 'Users',
    features: ['Create leads', 'Update records', 'Query SOQL', 'Webhooks'],
    setupTime: '10 min',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts and companies with HubSpot CRM.',
    category: 'crm',
    logo: 'Contact',
    features: [
      'CRM sync',
      'Form submissions',
      'Email tracking',
      'Deal management',
    ],
    setupTime: '7 min',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Manage deals and activities in Pipedrive.',
    category: 'crm',
    logo: 'TrendingUp',
    features: ['Create deals', 'Update activities', 'Person management'],
    setupTime: '6 min',
  },
  // Other
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and manage subscriptions.',
    category: 'other',
    logo: 'CreditCard',
    popular: true,
    features: [
      'Create payments',
      'Manage subscriptions',
      'Handle webhooks',
      'Invoice management',
    ],
    setupTime: '8 min',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS messages and make phone calls.',
    category: 'communication',
    logo: 'Phone',
    features: ['Send SMS', 'Make calls', 'WhatsApp support', 'Lookup numbers'],
    setupTime: '5 min',
  },
  {
    id: 'weather',
    name: 'OpenWeatherMap',
    description: 'Get weather data for any location worldwide.',
    category: 'other',
    logo: 'Cloud',
    features: ['Current weather', 'Forecasts', 'Historical data'],
    setupTime: '2 min',
  },
  {
    id: 'http',
    name: 'HTTP Requests',
    description: 'Make HTTP requests to any REST or GraphQL API.',
    category: 'other',
    logo: 'Globe',
    popular: true,
    features: [
      'GET/POST/PUT/DELETE',
      'Custom headers',
      'Auth support',
      'Webhook handling',
    ],
    setupTime: '3 min',
  },
]

export const integrationCategories = [
  { id: 'all', name: 'All Integrations', icon: 'Grid3x3' },
  { id: 'popular', name: 'Popular', icon: 'Star' },
  { id: 'communication', name: 'Communication', icon: 'MessageSquare' },
  { id: 'development', name: 'Development', icon: 'Code2' },
  { id: 'data', name: 'Data & Storage', icon: 'Database' },
  { id: 'productivity', name: 'Productivity', icon: 'LayoutGrid' },
  { id: 'ai', name: 'AI Services', icon: 'Sparkles' },
  { id: 'crm', name: 'CRM', icon: 'Users' },
  { id: 'other', name: 'Other', icon: 'MoreHorizontal' },
]
