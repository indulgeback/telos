import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Label } from '@/components/atoms/label'
import { Input } from '@/components/atoms/input'
import { Checkbox } from '@/components/atoms/checkbox'

const meta = {
  title: 'Telos/Atoms/Label',
  component: Label,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A label component built with Radix UI. Used to provide accessible labels for form controls.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

// 基础标签
export const Default: Story = {
  args: {
    children: 'Label',
  },
}

// 与输入框配合
export const WithInput: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='email'>Email</Label>
      <Input type='email' id='email' placeholder='Email' />
    </div>
  ),
}

// 与复选框配合
export const WithCheckbox: Story = {
  render: () => (
    <div className='flex items-center space-x-2'>
      <Checkbox id='terms' />
      <Label htmlFor='terms'>Accept terms and conditions</Label>
    </div>
  ),
}

// 必填标签
export const Required: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='name'>
        Name <span className='text-destructive'>*</span>
      </Label>
      <Input id='name' placeholder='Your name' />
    </div>
  ),
}

// 表单示例
export const FormExample: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-4'>
      <div className='grid gap-1.5'>
        <Label htmlFor='first-name'>First Name</Label>
        <Input id='first-name' placeholder='John' />
      </div>

      <div className='grid gap-1.5'>
        <Label htmlFor='last-name'>Last Name</Label>
        <Input id='last-name' placeholder='Doe' />
      </div>

      <div className='grid gap-1.5'>
        <Label htmlFor='bio'>Bio</Label>
        <Input id='bio' placeholder='Tell us about yourself' />
      </div>
    </div>
  ),
}
