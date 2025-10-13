import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ToggleGroup, ToggleGroupItem } from '@/components/atoms/toggle-group'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react'
import React from 'react'

const meta = {
  title: 'Telos/Atoms/ToggleGroup',
  component: ToggleGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A set of two-state buttons that can be toggled on or off. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

// 单选模式
export const Single: Story = {
  render: () => (
    <ToggleGroup type='single' defaultValue='center'>
      <ToggleGroupItem value='left' aria-label='Left aligned'>
        <AlignLeft className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='center' aria-label='Center aligned'>
        <AlignCenter className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='right' aria-label='Right aligned'>
        <AlignRight className='h-4 w-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// 多选模式
export const Multiple: Story = {
  render: () => (
    <ToggleGroup type='multiple'>
      <ToggleGroupItem value='bold' aria-label='Toggle bold'>
        <Bold className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='italic' aria-label='Toggle italic'>
        <Italic className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='underline' aria-label='Toggle underline'>
        <Underline className='h-4 w-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// Outline 样式
export const Outline: Story = {
  render: () => (
    <ToggleGroup type='single' variant='outline' defaultValue='center'>
      <ToggleGroupItem value='left' aria-label='Left aligned'>
        <AlignLeft className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='center' aria-label='Center aligned'>
        <AlignCenter className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='right' aria-label='Right aligned'>
        <AlignRight className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='justify' aria-label='Justify'>
        <AlignJustify className='h-4 w-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// 带文本
export const WithText: Story = {
  render: () => (
    <ToggleGroup type='multiple' variant='outline'>
      <ToggleGroupItem value='bold'>
        <Bold className='h-4 w-4 mr-2' />
        Bold
      </ToggleGroupItem>
      <ToggleGroupItem value='italic'>
        <Italic className='h-4 w-4 mr-2' />
        Italic
      </ToggleGroupItem>
      <ToggleGroupItem value='underline'>
        <Underline className='h-4 w-4 mr-2' />
        Underline
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// 小尺寸
export const SmallSize: Story = {
  render: () => (
    <ToggleGroup type='single' size='sm' variant='outline'>
      <ToggleGroupItem value='left'>
        <AlignLeft className='h-3 w-3' />
      </ToggleGroupItem>
      <ToggleGroupItem value='center'>
        <AlignCenter className='h-3 w-3' />
      </ToggleGroupItem>
      <ToggleGroupItem value='right'>
        <AlignRight className='h-3 w-3' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// 大尺寸
export const LargeSize: Story = {
  render: () => (
    <ToggleGroup type='single' size='lg' variant='outline'>
      <ToggleGroupItem value='left'>
        <AlignLeft className='h-5 w-5' />
      </ToggleGroupItem>
      <ToggleGroupItem value='center'>
        <AlignCenter className='h-5 w-5' />
      </ToggleGroupItem>
      <ToggleGroupItem value='right'>
        <AlignRight className='h-5 w-5' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// 禁用项
export const DisabledItem: Story = {
  render: () => (
    <ToggleGroup type='single' variant='outline'>
      <ToggleGroupItem value='left'>
        <AlignLeft className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='center' disabled>
        <AlignCenter className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem value='right'>
        <AlignRight className='h-4 w-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

// 可控状态
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = React.useState('center')

    return (
      <div className='space-y-4'>
        <ToggleGroup
          type='single'
          value={value}
          onValueChange={val => val && setValue(val)}
          variant='outline'
        >
          <ToggleGroupItem value='left'>
            <AlignLeft className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='center'>
            <AlignCenter className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='right'>
            <AlignRight className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
        <p className='text-sm text-muted-foreground'>
          Current alignment: <span className='font-medium'>{value}</span>
        </p>
      </div>
    )
  },
}

// 文本格式化工具栏
export const TextFormatting: Story = {
  render: () => {
    const [values, setValues] = React.useState<string[]>([])

    return (
      <div className='space-y-4'>
        <ToggleGroup
          type='multiple'
          value={values}
          onValueChange={setValues}
          variant='outline'
        >
          <ToggleGroupItem value='bold'>
            <Bold className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='italic'>
            <Italic className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='underline'>
            <Underline className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
        <p className='text-sm text-muted-foreground'>
          Active formats:{' '}
          <span className='font-medium'>{values.join(', ') || 'None'}</span>
        </p>
      </div>
    )
  },
}

// 视图切换
export const ViewSwitcher: Story = {
  render: () => {
    const [view, setView] = React.useState('grid')

    return (
      <div className='space-y-4'>
        <ToggleGroup
          type='single'
          value={view}
          onValueChange={val => val && setView(val)}
          variant='outline'
        >
          <ToggleGroupItem value='grid'>Grid</ToggleGroupItem>
          <ToggleGroupItem value='list'>List</ToggleGroupItem>
          <ToggleGroupItem value='table'>Table</ToggleGroupItem>
        </ToggleGroup>
        <div className='p-4 border rounded-md text-center'>
          <p className='text-sm'>Current view: {view}</p>
        </div>
      </div>
    )
  },
}

// 排序选择器
export const SortSelector: Story = {
  render: () => (
    <ToggleGroup type='single' defaultValue='recent' variant='outline'>
      <ToggleGroupItem value='popular'>Popular</ToggleGroupItem>
      <ToggleGroupItem value='recent'>Recent</ToggleGroupItem>
      <ToggleGroupItem value='oldest'>Oldest</ToggleGroupItem>
    </ToggleGroup>
  ),
}
