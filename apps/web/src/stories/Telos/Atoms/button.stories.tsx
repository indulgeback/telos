import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/atoms/button'
import { ChevronRight, Download, Plus, Settings } from 'lucide-react'

const meta = {
  title: 'Telos/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile button component with multiple variants, sizes, and radius options. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
        'smart-text-1',
        'smart-text-2',
        'smart-text-3',
        'smart-text-4',
        'smart-fill-1',
        'smart-fill-2',
        'smart-fill-3',
        'smart-fill-4',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    radius: {
      control: 'select',
      options: ['default', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    asChild: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
  args: { onClick: () => {} },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// 基础变体
export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
}

// 智能渐变文本变体
export const SmartText1: Story = {
  args: {
    variant: 'smart-text-1',
    children: 'Smart Text 1',
  },
}

export const SmartText2: Story = {
  args: {
    variant: 'smart-text-2',
    children: 'Smart Text 2',
  },
}

export const SmartText3: Story = {
  args: {
    variant: 'smart-text-3',
    children: 'Smart Text 3',
  },
}

export const SmartText4: Story = {
  args: {
    variant: 'smart-text-4',
    children: 'Smart Text 4',
  },
}

// 智能渐变填充变体
export const SmartFill1: Story = {
  args: {
    variant: 'smart-fill-1',
    children: 'Smart Fill 1',
  },
}

export const SmartFill2: Story = {
  args: {
    variant: 'smart-fill-2',
    children: 'Smart Fill 2',
  },
}

export const SmartFill3: Story = {
  args: {
    variant: 'smart-fill-3',
    children: 'Smart Fill 3',
  },
}

export const SmartFill4: Story = {
  args: {
    variant: 'smart-fill-4',
    children: 'Smart Fill 4',
  },
}

// 尺寸变体
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
}

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Settings className='h-4 w-4' />,
  },
}

// 圆角变体
export const RoundedSmall: Story = {
  args: {
    radius: 'sm',
    children: 'Small Radius',
  },
}

export const RoundedLarge: Story = {
  args: {
    radius: 'lg',
    children: 'Large Radius',
  },
}

export const RoundedFull: Story = {
  args: {
    radius: 'full',
    children: 'Full Radius',
  },
}

// 带图标的按钮
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Download className='mr-2 h-4 w-4' />
        Download
      </>
    ),
  },
}

export const WithTrailingIcon: Story = {
  args: {
    children: (
      <>
        Continue
        <ChevronRight className='ml-2 h-4 w-4' />
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <Plus className='h-4 w-4' />,
  },
}

// 状态
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}

// 变体组合展示
export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button variant='default'>Default</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Button size='sm'>Small</Button>
      <Button size='default'>Default</Button>
      <Button size='lg'>Large</Button>
      <Button size='icon'>
        <Settings className='h-4 w-4' />
      </Button>
    </div>
  ),
}

export const SmartVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button variant='smart-text-1'>Smart Text 1</Button>
      <Button variant='smart-text-2'>Smart Text 2</Button>
      <Button variant='smart-text-3'>Smart Text 3</Button>
      <Button variant='smart-text-4'>Smart Text 4</Button>
      <Button variant='smart-fill-1'>Smart Fill 1</Button>
      <Button variant='smart-fill-2'>Smart Fill 2</Button>
      <Button variant='smart-fill-3'>Smart Fill 3</Button>
      <Button variant='smart-fill-4'>Smart Fill 4</Button>
    </div>
  ),
}
