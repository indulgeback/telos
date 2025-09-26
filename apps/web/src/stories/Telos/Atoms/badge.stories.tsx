import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Badge } from '@/components/atoms/badge'

const meta = {
  title: 'Telos/Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A badge component for highlighting important information, status indicators, and labels.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

// 基础徽章
export const Default: Story = {
  args: {
    children: 'Badge',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

// 状态徽章
export const Status: Story = {
  render: () => (
    <div className='flex gap-2'>
      <Badge variant='default'>Active</Badge>
      <Badge variant='secondary'>Pending</Badge>
      <Badge variant='destructive'>Error</Badge>
      <Badge variant='outline'>Draft</Badge>
    </div>
  ),
}

// 数字徽章
export const Numbers: Story = {
  render: () => (
    <div className='flex gap-2'>
      <Badge>1</Badge>
      <Badge variant='secondary'>99+</Badge>
      <Badge variant='destructive'>!</Badge>
    </div>
  ),
}

// 不同大小的徽章
export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-2'>
      <Badge className='text-xs px-1.5 py-0.5'>Small</Badge>
      <Badge>Default</Badge>
      <Badge className='text-sm px-3 py-1'>Large</Badge>
    </div>
  ),
}
