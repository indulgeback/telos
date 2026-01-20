/**
 * Roadmap Data
 * Product development roadmap and upcoming features
 */

export interface RoadmapItem {
  id: string
  title: string
  description: string
  status: 'completed' | 'in-progress' | 'planned' | 'beta'
  quarter: string
  category:
    | 'ai'
    | 'integration'
    | 'workflow'
    | 'platform'
    | 'security'
    | 'performance'
  votes: number
  features: string[]
}

export const roadmapItems: RoadmapItem[] = [
  // Q4 2024 - Completed
  {
    id: 'multi-language',
    title: 'Multi-Language Support',
    description:
      'Full internationalization support for 18+ languages with localized workflows and templates.',
    status: 'completed',
    quarter: 'Q4 2024',
    category: 'platform',
    votes: 245,
    features: [
      '18 language translations',
      'Localized workflow templates',
      'RTL language support',
      'Language-specific integrations',
    ],
  },
  {
    id: 'ai-decision-engine',
    title: 'AI Decision Engine',
    description:
      'Advanced AI-powered decision making for complex workflow branching and conditional logic.',
    status: 'completed',
    quarter: 'Q4 2024',
    category: 'ai',
    votes: 312,
    features: [
      'Natural language conditions',
      'Predictive workflow optimization',
      'Smart error handling',
      'Auto-retry with exponential backoff',
    ],
  },
  {
    id: 'workflow-analytics',
    title: 'Workflow Analytics Dashboard',
    description:
      'Comprehensive analytics and insights for workflow performance, bottlenecks, and optimization opportunities.',
    status: 'completed',
    quarter: 'Q4 2024',
    category: 'platform',
    votes: 287,
    features: [
      'Real-time execution monitoring',
      'Performance metrics',
      'Bottleneck identification',
      'Custom dashboards',
    ],
  },
  // Q1 2025 - In Progress
  {
    id: 'visual-builder-v2',
    title: 'Visual Workflow Builder V2',
    description:
      'Next-generation visual builder with drag-and-drop, real-time collaboration, and AI-powered suggestions.',
    status: 'in-progress',
    quarter: 'Q1 2025',
    category: 'workflow',
    votes: 456,
    features: [
      'Drag-and-drop interface',
      'Real-time team collaboration',
      'AI-powered workflow suggestions',
      'Template library',
      'Version history',
    ],
  },
  {
    id: 'enterprise-ssm',
    title: 'Enterprise SSO & SAML',
    description:
      'Single sign-on integration with major identity providers and SAML 2.0 support.',
    status: 'in-progress',
    quarter: 'Q1 2025',
    category: 'security',
    votes: 198,
    features: [
      'SAML 2.0 support',
      'Okta integration',
      'Azure AD integration',
      'Google Workspace integration',
      'Custom SAML providers',
    ],
  },
  {
    id: 'api-v2',
    title: 'REST API V2',
    description:
      'Completely redesigned API with improved performance, better documentation, and SDK support.',
    status: 'in-progress',
    quarter: 'Q1 2025',
    category: 'platform',
    votes: 234,
    features: [
      'GraphQL support',
      'Webhook improvements',
      'Rate limiting',
      'API keys management',
      'Official SDKs (JS, Python, Go)',
    ],
  },
  // Q2 2025 - Planned
  {
    id: 'custom-connectors',
    title: 'Custom Connector Builder',
    description:
      'Build and publish custom connectors for any API with our low-code connector SDK.',
    status: 'planned',
    quarter: 'Q2 2025',
    category: 'integration',
    votes: 378,
    features: [
      'Visual connector builder',
      'Authentication wizards',
      'Rate limit handling',
      'Webhook support',
      'Connector marketplace',
    ],
  },
  {
    id: 'workflow-templates-marketplace',
    title: 'Workflow Templates Marketplace',
    description:
      'Community-driven marketplace for sharing and discovering workflow templates.',
    status: 'planned',
    quarter: 'Q2 2025',
    category: 'workflow',
    votes: 298,
    features: [
      'Browse community templates',
      'Publish your own templates',
      'Rating and reviews',
      'One-click deployment',
      'Template customization',
    ],
  },
  {
    id: 'advanced-scheduling',
    title: 'Advanced Scheduling & Cron',
    description:
      'Powerful scheduling options including cron expressions, timezone support, and calendar-based triggers.',
    status: 'planned',
    quarter: 'Q2 2025',
    category: 'workflow',
    votes: 267,
    features: [
      'Cron expression builder',
      'Timezone-aware scheduling',
      'Calendar-based triggers',
      'Holiday calendars',
      'Workflow dependencies',
    ],
  },
  {
    id: 'audit-logs',
    title: 'Comprehensive Audit Logs',
    description:
      'Detailed audit logging for compliance, security, and operational insights.',
    status: 'planned',
    quarter: 'Q2 2025',
    category: 'security',
    votes: 189,
    features: [
      'User activity logs',
      'Workflow execution logs',
      'API access logs',
      'Export capabilities',
      'Log retention policies',
    ],
  },
  // Q3 2025 - Planned
  {
    id: 'ai-agents-framework',
    title: 'AI Agents Framework',
    description:
      'Build autonomous AI agents that can execute complex multi-step tasks with minimal supervision.',
    status: 'planned',
    quarter: 'Q3 2025',
    category: 'ai',
    votes: 523,
    features: [
      'Agent builder interface',
      'Tool library',
      'Memory management',
      'Multi-agent collaboration',
      'Human-in-the-loop',
    ],
  },
  {
    id: 'self-hosted',
    title: 'Self-Hosted Deployment',
    description:
      'Deploy Telos on your own infrastructure with Docker and Kubernetes support.',
    status: 'planned',
    quarter: 'Q3 2025',
    category: 'platform',
    votes: 445,
    features: [
      'Docker deployment',
      'Kubernetes Helm charts',
      'Air-gapped deployment',
      'Custom branding',
      'On-premise support',
    ],
  },
  {
    id: 'edge-functions',
    title: 'Edge Function Support',
    description:
      'Run workflow steps at the edge for ultra-low latency processing.',
    status: 'planned',
    quarter: 'Q3 2025',
    category: 'performance',
    votes: 167,
    features: [
      'Global edge network',
      'Function deployment',
      'Edge data storage',
      'Regional execution',
    ],
  },
  // Q4 2025 - Beta
  {
    id: 'mobile-app',
    title: 'Mobile Apps',
    description:
      'Native iOS and Android apps for monitoring and managing workflows on the go.',
    status: 'beta',
    quarter: 'Q4 2025',
    category: 'platform',
    votes: 389,
    features: [
      'Push notifications',
      'Workflow monitoring',
      'Quick actions',
      'Approvals on the go',
      'Offline mode',
    ],
  },
  {
    id: 'workflow-versioning',
    title: 'Workflow Versioning & Rollback',
    description:
      'Full version control for workflows with diff views and instant rollback.',
    status: 'beta',
    quarter: 'Q4 2025',
    category: 'workflow',
    votes: 234,
    features: [
      'Git-like version control',
      'Visual diff',
      'One-click rollback',
      'Branching strategies',
      'Merge requests',
    ],
  },
]

export const roadmapQuarters = [
  { id: 'all', name: 'All Features' },
  { id: 'Q4 2024', name: 'Q4 2024' },
  { id: 'Q1 2025', name: 'Q1 2025' },
  { id: 'Q2 2025', name: 'Q2 2025' },
  { id: 'Q3 2025', name: 'Q3 2025' },
  { id: 'Q4 2025', name: 'Q4 2025' },
]

export const roadmapCategories = [
  { id: 'all', name: 'All Categories', icon: 'Grid3x3' },
  { id: 'ai', name: 'AI & ML', icon: 'Sparkles' },
  { id: 'integration', name: 'Integrations', icon: 'Puzzle' },
  { id: 'workflow', name: 'Workflow', icon: 'GitBranch' },
  { id: 'platform', name: 'Platform', icon: 'Layers' },
  { id: 'security', name: 'Security', icon: 'Shield' },
  { id: 'performance', name: 'Performance', icon: 'Zap' },
]

export const statusConfig = {
  completed: {
    label: 'Completed',
    color:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: 'CheckCircle',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'Clock',
  },
  planned: {
    label: 'Planned',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: 'Calendar',
  },
  beta: {
    label: 'Beta',
    color:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: 'Flame',
  },
}
