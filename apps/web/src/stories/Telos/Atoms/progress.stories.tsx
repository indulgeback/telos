import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Progress } from '@/components/atoms/progress'
import { Label } from '@/components/atoms/label'
import { useState, useEffect } from 'react'

const meta = {
  title: 'Telos/Atoms/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A progress component built with Radix UI. Used to show completion progress or loading states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

// 基础进度条
export const Default: Story = {
  render: args => (
    <div className='w-80'>
      <Progress {...args} />
    </div>
  ),
  args: {
    value: 33,
  },
}

export const Empty: Story = {
  render: args => (
    <div className='w-80'>
      <Progress {...args} />
    </div>
  ),
  args: {
    value: 0,
  },
}

export const Half: Story = {
  render: args => (
    <div className='w-80'>
      <Progress {...args} />
    </div>
  ),
  args: {
    value: 50,
  },
}

export const Complete: Story = {
  render: args => (
    <div className='w-80'>
      <Progress {...args} />
    </div>
  ),
  args: {
    value: 100,
  },
}

// 带标签的进度条
export const WithLabel: Story = {
  render: args => (
    <div className='w-80 space-y-2'>
      <div className='flex justify-between text-sm'>
        <Label>Progress</Label>
        <span>{args.value}%</span>
      </div>
      <Progress {...args} />
    </div>
  ),
  args: {
    value: 67,
  },
}

// 动画进度条
export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
      const timer = setTimeout(() => setProgress(66), 500)
      return () => clearTimeout(timer)
    }, [])

    return (
      <div className='w-80 space-y-2'>
        <div className='flex justify-between text-sm'>
          <Label>Loading...</Label>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    )
  },
}

// 技能进度
export const SkillProgress: Story = {
  render: () => (
    <div className='w-80 space-y-4'>
      <div>
        <div className='flex justify-between mb-1'>
          <span className='text-sm font-medium'>JavaScript</span>
          <span className='text-sm text-muted-foreground'>90%</span>
        </div>
        <Progress value={90} />
      </div>
      <div>
        <div className='flex justify-between mb-1'>
          <span className='text-sm font-medium'>React</span>
          <span className='text-sm text-muted-foreground'>85%</span>
        </div>
        <Progress value={85} />
      </div>
      <div>
        <div className='flex justify-between mb-1'>
          <span className='text-sm font-medium'>TypeScript</span>
          <span className='text-sm text-muted-foreground'>80%</span>
        </div>
        <Progress value={80} />
      </div>
    </div>
  ),
}
