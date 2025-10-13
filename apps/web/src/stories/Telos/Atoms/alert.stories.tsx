import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert'
import {
  Terminal,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Lightbulb,
  Rocket,
} from 'lucide-react'
import React from 'react'

const meta = {
  title: 'Telos/Atoms/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An alert component to display important messages to users. Supports multiple variants and can include icons, titles, and descriptions.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

// 基础警告框
export const Default: Story = {
  render: () => (
    <Alert className='w-[500px]'>
      <Terminal />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
}

// 破坏性警告
export const Destructive: Story = {
  render: () => (
    <Alert variant='destructive' className='w-[500px]'>
      <AlertCircle />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
}

// 仅标题
export const TitleOnly: Story = {
  render: () => (
    <Alert className='w-[500px]'>
      <Info />
      <AlertTitle>This is an important notification</AlertTitle>
    </Alert>
  ),
}

// 仅描述
export const DescriptionOnly: Story = {
  render: () => (
    <Alert className='w-[500px]'>
      <AlertDescription>
        This is a simple alert with just a description and no title.
      </AlertDescription>
    </Alert>
  ),
}

// 无图标
export const NoIcon: Story = {
  render: () => (
    <Alert className='w-[500px]'>
      <AlertTitle>Simple Alert</AlertTitle>
      <AlertDescription>
        This alert doesn't have an icon, just text content.
      </AlertDescription>
    </Alert>
  ),
}

// 成功消息
export const Success: Story = {
  render: () => (
    <Alert className='w-[500px] border-green-500/50 text-green-700 dark:text-green-400'>
      <CheckCircle2 className='text-green-600 dark:text-green-400' />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription className='text-green-600/90 dark:text-green-400/90'>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
}

// 信息消息
export const InfoMessage: Story = {
  render: () => (
    <Alert className='w-[500px] border-blue-500/50 text-blue-700 dark:text-blue-400'>
      <Info className='text-blue-600 dark:text-blue-400' />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription className='text-blue-600/90 dark:text-blue-400/90'>
        New features are now available. Check them out in the settings.
      </AlertDescription>
    </Alert>
  ),
}

// 警告消息
export const Warning: Story = {
  render: () => (
    <Alert className='w-[500px] border-yellow-500/50 text-yellow-700 dark:text-yellow-400'>
      <AlertTriangle className='text-yellow-600 dark:text-yellow-400' />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription className='text-yellow-600/90 dark:text-yellow-400/90'>
        Your storage is almost full. Please delete some files.
      </AlertDescription>
    </Alert>
  ),
}

// 提示消息
export const Tip: Story = {
  render: () => (
    <Alert className='w-[500px] border-purple-500/50 text-purple-700 dark:text-purple-400'>
      <Lightbulb className='text-purple-600 dark:text-purple-400' />
      <AlertTitle>Pro Tip</AlertTitle>
      <AlertDescription className='text-purple-600/90 dark:text-purple-400/90'>
        You can use keyboard shortcuts to speed up your workflow. Press ? to see
        all shortcuts.
      </AlertDescription>
    </Alert>
  ),
}

// 多个警告框
export const MultipleAlerts: Story = {
  render: () => (
    <div className='space-y-4 w-[500px]'>
      <Alert className='border-green-500/50 text-green-700 dark:text-green-400'>
        <CheckCircle2 className='text-green-600 dark:text-green-400' />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription className='text-green-600/90 dark:text-green-400/90'>
          Profile updated successfully.
        </AlertDescription>
      </Alert>

      <Alert className='border-blue-500/50 text-blue-700 dark:text-blue-400'>
        <Info className='text-blue-600 dark:text-blue-400' />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription className='text-blue-600/90 dark:text-blue-400/90'>
          New version available.
        </AlertDescription>
      </Alert>

      <Alert className='border-yellow-500/50 text-yellow-700 dark:text-yellow-400'>
        <AlertTriangle className='text-yellow-600 dark:text-yellow-400' />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription className='text-yellow-600/90 dark:text-yellow-400/90'>
          Low storage space.
        </AlertDescription>
      </Alert>

      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to save changes.</AlertDescription>
      </Alert>
    </div>
  ),
}

// 带列表的警告框
export const WithList: Story = {
  render: () => (
    <Alert className='w-[500px]'>
      <Info />
      <AlertTitle>System Requirements</AlertTitle>
      <AlertDescription>
        <p className='mb-2'>
          Make sure your system meets the following requirements:
        </p>
        <ul className='list-disc list-inside space-y-1'>
          <li>Node.js 18.0 or higher</li>
          <li>npm 9.0 or higher</li>
          <li>At least 4GB of RAM</li>
          <li>10GB of free disk space</li>
        </ul>
      </AlertDescription>
    </Alert>
  ),
}

// 带按钮的警告框
export const WithAction: Story = {
  render: () => (
    <Alert className='w-[500px]'>
      <Rocket />
      <AlertTitle>New Feature Available</AlertTitle>
      <AlertDescription>
        <p className='mb-3'>
          We've just released a new feature that will help you work more
          efficiently.
        </p>
        <button
          type='button'
          className='inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90'
        >
          Learn More
        </button>
      </AlertDescription>
    </Alert>
  ),
}

// 长内容警告框
export const LongContent: Story = {
  render: () => (
    <Alert className='w-[600px]'>
      <AlertCircle />
      <AlertTitle>Terms of Service Update</AlertTitle>
      <AlertDescription>
        <p className='mb-2'>
          We've updated our Terms of Service to better reflect our current
          practices and to improve clarity. The key changes include:
        </p>
        <ul className='list-disc list-inside space-y-1 mb-3'>
          <li>Enhanced data privacy protections</li>
          <li>Clearer explanation of data usage</li>
          <li>Updated refund policy</li>
          <li>New dispute resolution process</li>
        </ul>
        <p>
          Please review the updated terms at your convenience. By continuing to
          use our service, you agree to these updated terms.
        </p>
      </AlertDescription>
    </Alert>
  ),
}

// 可关闭的警告框
export const Dismissible: Story = {
  render: () => {
    const [show, setShow] = React.useState(true)

    if (!show) {
      return (
        <button
          type='button'
          onClick={() => setShow(true)}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          Show alert again
        </button>
      )
    }

    return (
      <Alert className='w-[500px] relative'>
        <Info />
        <AlertTitle>Cookie Notice</AlertTitle>
        <AlertDescription>
          We use cookies to improve your experience on our site.
        </AlertDescription>
        <button
          type='button'
          onClick={() => setShow(false)}
          className='absolute top-3 right-3 rounded-sm opacity-70 transition-opacity hover:opacity-100'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
          <span className='sr-only'>Close</span>
        </button>
      </Alert>
    )
  },
}

// 紧凑样式
export const Compact: Story = {
  render: () => (
    <Alert className='w-[500px] py-2'>
      <CheckCircle2 className='h-3 w-3' />
      <AlertDescription className='text-xs'>
        Changes saved successfully
      </AlertDescription>
    </Alert>
  ),
}
