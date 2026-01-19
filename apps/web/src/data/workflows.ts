/**
 * Workflow Templates Data
 * Pre-built workflow templates for users to start with
 */

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'automation' | 'integration' | 'ai' | 'data' | 'communication'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  popularity: number // For sorting
  tags: string[]
  steps: number
  estimatedTime: string // e.g., "5 min"
  icon?: string
}

export const workflowTemplates: WorkflowTemplate[] = [
  // Automation Category
  {
    id: 'slack-auto-assign',
    name: 'Slack Task Auto-Assign',
    description:
      'Automatically assign incoming Slack requests to team members based on their workload and expertise.',
    category: 'automation',
    difficulty: 'beginner',
    popularity: 95,
    tags: ['slack', 'task-management', 'auto-assign'],
    steps: 5,
    estimatedTime: '5 min',
  },
  {
    id: 'github-pr-reminder',
    name: 'GitHub PR Reminder',
    description:
      'Send automated reminders for pending pull requests that need review.',
    category: 'automation',
    difficulty: 'beginner',
    popularity: 88,
    tags: ['github', 'notifications', 'pr'],
    steps: 4,
    estimatedTime: '3 min',
  },
  {
    id: 'email-categorization',
    name: 'AI Email Categorization',
    description:
      'Use AI to automatically categorize incoming emails and route them to the right team.',
    category: 'ai',
    difficulty: 'intermediate',
    popularity: 92,
    tags: ['email', 'ai', 'categorization'],
    steps: 7,
    estimatedTime: '10 min',
  },
  {
    id: 'data-sync',
    name: 'Multi-System Data Sync',
    description:
      'Synchronize data between PostgreSQL, MongoDB, and external APIs in real-time.',
    category: 'data',
    difficulty: 'advanced',
    popularity: 75,
    tags: ['database', 'sync', 'api'],
    steps: 10,
    estimatedTime: '15 min',
  },
  // Integration Category
  {
    id: 'jira-slack-sync',
    name: 'Jira-Slack Two-Way Sync',
    description:
      'Keep Jira tickets and Slack channels in sync with bidirectional updates.',
    category: 'integration',
    difficulty: 'intermediate',
    popularity: 85,
    tags: ['jira', 'slack', 'sync'],
    steps: 8,
    estimatedTime: '12 min',
  },
  {
    id: 'notion-calendar',
    name: 'Notion to Calendar Events',
    description:
      'Convert Notion database entries to Google Calendar events automatically.',
    category: 'integration',
    difficulty: 'beginner',
    popularity: 78,
    tags: ['notion', 'google-calendar', 'productivity'],
    steps: 6,
    estimatedTime: '8 min',
  },
  {
    id: 'salesforce-enrichment',
    name: 'SalesLead Auto-Enrichment',
    description:
      'Automatically enrich new Salesforce leads with data from multiple APIs.',
    category: 'integration',
    difficulty: 'advanced',
    popularity: 70,
    tags: ['salesforce', 'enrichment', 'sales'],
    steps: 12,
    estimatedTime: '20 min',
  },
  // AI Category
  {
    id: 'ai-customer-support',
    name: 'AI Customer Support Triage',
    description:
      'Use AI to analyze customer inquiries and route them to the appropriate support tier.',
    category: 'ai',
    difficulty: 'intermediate',
    popularity: 90,
    tags: ['ai', 'support', 'triage'],
    steps: 9,
    estimatedTime: '15 min',
  },
  {
    id: 'sentiment-analysis',
    name: 'Social Media Sentiment Analysis',
    description:
      'Monitor social media mentions and analyze sentiment trends over time.',
    category: 'ai',
    difficulty: 'advanced',
    popularity: 65,
    tags: ['ai', 'social-media', 'sentiment'],
    steps: 11,
    estimatedTime: '18 min',
  },
  {
    id: 'ai-content-summary',
    name: 'AI Content Summarization',
    description:
      'Automatically summarize long documents and distribute summaries to relevant channels.',
    category: 'ai',
    difficulty: 'beginner',
    popularity: 80,
    tags: ['ai', 'summarization', 'content'],
    steps: 5,
    estimatedTime: '7 min',
  },
  // Communication Category
  {
    id: 'weekly-report',
    name: 'Automated Weekly Report',
    description:
      'Generate and email weekly activity reports from multiple data sources.',
    category: 'communication',
    difficulty: 'intermediate',
    popularity: 82,
    tags: ['reporting', 'email', 'automation'],
    steps: 8,
    estimatedTime: '10 min',
  },
  {
    id: 'onboarding-sequence',
    name: 'New User Onboarding Sequence',
    description:
      'Send a series of targeted messages and resources to new users over their first week.',
    category: 'communication',
    difficulty: 'beginner',
    popularity: 76,
    tags: ['onboarding', 'email', 'automation'],
    steps: 6,
    estimatedTime: '8 min',
  },
  // Data Category
  {
    id: 'scheduled-backup',
    name: 'Scheduled Database Backup',
    description:
      'Automate regular database backups with failure notifications and retry logic.',
    category: 'data',
    difficulty: 'intermediate',
    popularity: 72,
    tags: ['backup', 'database', 'scheduled'],
    steps: 7,
    estimatedTime: '10 min',
  },
  {
    id: 'csv-processing',
    name: 'CSV Data Processing Pipeline',
    description:
      'Parse, validate, transform, and load CSV data into any database or API.',
    category: 'data',
    difficulty: 'beginner',
    popularity: 85,
    tags: ['csv', 'data-processing', 'etl'],
    steps: 5,
    estimatedTime: '7 min',
  },
]

export const workflowCategories = [
  { id: 'automation', name: 'Automation', icon: 'Zap' },
  { id: 'integration', name: 'Integration', icon: 'Puzzle' },
  { id: 'ai', name: 'AI-Powered', icon: 'Sparkles' },
  { id: 'data', name: 'Data Management', icon: 'Database' },
  { id: 'communication', name: 'Communication', icon: 'MessageSquare' },
]

export const difficultyLevels = [
  { id: 'beginner', name: 'Beginner', color: 'green' },
  { id: 'intermediate', name: 'Intermediate', color: 'yellow' },
  { id: 'advanced', name: 'Advanced', color: 'red' },
]
