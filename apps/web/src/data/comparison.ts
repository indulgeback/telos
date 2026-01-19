/**
 * Comparison Data
 * Feature comparison with competitors
 */

export interface FeatureComparison {
  category: string
  features: {
    name: string
    description?: string
    telos: 'yes' | 'partial' | 'no' | 'premium'
    n8n: 'yes' | 'partial' | 'no' | 'premium'
    zapier: 'yes' | 'partial' | 'no' | 'premium'
    make: 'yes' | 'partial' | 'no' | 'premium'
  }[]
}

export const comparisonData: FeatureComparison[] = [
  {
    category: 'Core Features',
    features: [
      {
        name: 'Visual Workflow Builder',
        description: 'Drag-and-drop interface for creating workflows',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'AI Agent Support',
        description: 'Native AI agents for decision-making',
        telos: 'yes',
        n8n: 'partial',
        zapier: 'partial',
        make: 'partial',
      },
      {
        name: 'Conditional Logic',
        description: 'Advanced branching and conditions',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'partial',
        make: 'yes',
      },
      {
        name: 'Error Handling',
        description: 'Retry logic and error workflows',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'partial',
        make: 'yes',
      },
      {
        name: 'Workflow Scheduling',
        description: 'Cron, interval, and event-based triggers',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
    ],
  },
  {
    category: 'Integrations',
    features: [
      {
        name: 'Number of Integrations',
        description: 'Available third-party service connections',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'Custom Connectors',
        description: 'Build your own integrations',
        telos: 'partial',
        n8n: 'yes',
        zapier: 'premium',
        make: 'partial',
      },
      {
        name: 'API Access',
        description: 'RESTful API for programmatic access',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'premium',
        make: 'premium',
      },
      {
        name: 'Webhook Support',
        description: 'Send and receive webhooks',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'HTTP Requests',
        description: 'Make requests to any API',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
    ],
  },
  {
    category: 'AI & Automation',
    features: [
      {
        name: 'AI Decision Engine',
        description: 'AI-powered workflow decisions',
        telos: 'yes',
        n8n: 'no',
        zapier: 'partial',
        make: 'partial',
      },
      {
        name: 'Natural Language Processing',
        description: 'Use natural language in workflows',
        telos: 'yes',
        n8n: 'no',
        zapier: 'partial',
        make: 'no',
      },
      {
        name: 'Code Execution',
        description: 'Run custom code in workflows',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'partial',
        make: 'yes',
      },
      {
        name: 'ML Model Integration',
        description: 'Connect to ML models and services',
        telos: 'yes',
        n8n: 'partial',
        zapier: 'partial',
        make: 'partial',
      },
    ],
  },
  {
    category: 'Team & Collaboration',
    features: [
      {
        name: 'Team Collaboration',
        description: 'Multiple users working together',
        telos: 'yes',
        n8n: 'partial',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'Role-Based Access',
        description: 'Granular permissions for team members',
        telos: 'yes',
        n8n: 'no',
        zapier: 'premium',
        make: 'premium',
      },
      {
        name: 'Workflow Sharing',
        description: 'Share workflows with team or publicly',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'Activity Logs',
        description: 'Audit trail of all actions',
        telos: 'yes',
        n8n: 'no',
        zapier: 'premium',
        make: 'premium',
      },
    ],
  },
  {
    category: 'Enterprise',
    features: [
      {
        name: 'SSO / SAML',
        description: 'Single sign-on integration',
        telos: 'yes',
        n8n: 'no',
        zapier: 'premium',
        make: 'premium',
      },
      {
        name: 'Self-Hosted Option',
        description: 'Deploy on your own infrastructure',
        telos: 'partial',
        n8n: 'yes',
        zapier: 'no',
        make: 'premium',
      },
      {
        name: 'SLA Guarantee',
        description: 'Service level agreement',
        telos: 'yes',
        n8n: 'premium',
        zapier: 'premium',
        make: 'premium',
      },
      {
        name: 'Dedicated Support',
        description: 'Priority support and account management',
        telos: 'yes',
        n8n: 'premium',
        zapier: 'premium',
        make: 'premium',
      },
    ],
  },
  {
    category: 'Developer Experience',
    features: [
      {
        name: 'API-first Design',
        description: 'Full API access for automation',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'Webhook Support',
        description: 'Webhooks for real-time events',
        telos: 'yes',
        n8n: 'yes',
        zapier: 'yes',
        make: 'yes',
      },
      {
        name: 'SDK Available',
        description: 'Official software development kits',
        telos: 'partial',
        n8n: 'no',
        zapier: 'no',
        make: 'no',
      },
      {
        name: 'CLI Tool',
        description: 'Command-line interface',
        telos: 'yes',
        n8n: 'partial',
        zapier: 'no',
        make: 'no',
      },
    ],
  },
]

export const competitors = [
  {
    id: 'telos',
    name: 'Telos',
    tagline: 'AI-Native Workflow Automation',
    logo: 'Sparkles',
    color: 'primary',
    highlight: true,
  },
  {
    id: 'n8n',
    name: 'n8n',
    tagline: 'Open Source Workflow Automation',
    logo: 'GitBranch',
    color: 'gray',
    highlight: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    tagline: 'Easy Automation for Everyone',
    logo: 'Zap',
    color: 'orange',
    highlight: false,
  },
  {
    id: 'make',
    name: 'Make',
    tagline: 'Design, Build, Automate',
    logo: 'Settings',
    color: 'purple',
    highlight: false,
  },
]

export const featureIcons: Record<string, string> = {
  'Visual Workflow Builder': 'Workflow',
  'AI Agent Support': 'Sparkles',
  'Conditional Logic': 'GitBranch',
  'Error Handling': 'Shield',
  'Workflow Scheduling': 'Clock',
  'Number of Integrations': 'Puzzle',
  'Custom Connectors': 'Wrench',
  'API Access': 'Code',
  'Webhook Support': 'Webhook',
  'HTTP Requests': 'Globe',
  'AI Decision Engine': 'Brain',
  'Natural Language Processing': 'MessageSquare',
  'Code Execution': 'FileCode',
  'ML Model Integration': 'Cpu',
  'Team Collaboration': 'Users',
  'Role-Based Access': 'Key',
  'Workflow Sharing': 'Share',
  'Activity Logs': 'FileText',
  'SSO / SAML': 'Lock',
  'Self-Hosted Option': 'Server',
  'SLA Guarantee': 'ShieldCheck',
  'Dedicated Support': 'Headphones',
  'API-first Design': 'Api',
  'SDK Available': 'Box',
  'CLI Tool': 'Terminal',
}
