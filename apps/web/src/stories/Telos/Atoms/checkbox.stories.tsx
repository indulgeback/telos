import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Checkbox } from '@/components/atoms/checkbox'
import { Label } from '@/components/atoms/label'

const meta = {
  title: 'Telos/Atoms/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A checkbox component built with Radix UI. Used for binary choices and multiple selections.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

// 基础复选框
export const Default: Story = {
  args: {},
}

export const Checked: Story = {
  args: {
    checked: true,
  },
}

export const Unchecked: Story = {
  args: {
    checked: false,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
}

// 带标签的复选框
export const WithLabel: Story = {
  render: args => (
    <div className='flex items-center space-x-2'>
      <Checkbox {...args} id='terms' />
      <Label htmlFor='terms'>Accept terms and conditions</Label>
    </div>
  ),
}

export const WithLabelChecked: Story = {
  render: args => (
    <div className='flex items-center space-x-2'>
      <Checkbox {...args} id='newsletter' />
      <Label htmlFor='newsletter'>Subscribe to newsletter</Label>
    </div>
  ),
  args: {
    checked: true,
  },
}

// 复选框列表
export const CheckboxList: Story = {
  render: () => (
    <div className='space-y-4'>
      <div className='flex items-center space-x-2'>
        <Checkbox id='item1' checked />
        <Label htmlFor='item1'>Completed item</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='item2' />
        <Label htmlFor='item2'>Pending item</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='item3' />
        <Label htmlFor='item3'>Another pending item</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='item4' disabled />
        <Label htmlFor='item4' className='opacity-50'>
          Disabled item
        </Label>
      </div>
    </div>
  ),
}
