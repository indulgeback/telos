import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { Search, Mail, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const meta = {
  title: 'Telos/Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible input component with built-in styling and support for various input types. Features hover effects, focus states, and validation styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: [
        'text',
        'email',
        'password',
        'number',
        'search',
        'tel',
        'url',
        'file',
      ],
    },
    placeholder: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

// 基础输入框
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Sample text',
    placeholder: 'Enter text...',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
}

// 不同类型的输入框
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
}

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter number',
  },
}

export const SearchInput: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
}

export const File: Story = {
  args: {
    type: 'file',
  },
}

// 带标签的输入框
export const WithLabel: Story = {
  render: args => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='email'>Email</Label>
      <Input {...args} id='email' />
    </div>
  ),
  args: {
    type: 'email',
    placeholder: 'Email',
  },
}

export const WithLabelAndHelperText: Story = {
  render: args => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='email-2'>Email</Label>
      <Input {...args} id='email-2' />
      <p className='text-sm text-muted-foreground'>
        We'll never share your email with anyone else.
      </p>
    </div>
  ),
  args: {
    type: 'email',
    placeholder: 'Email',
  },
}

// 带图标的输入框
export const WithIcon: Story = {
  render: args => (
    <div className='relative'>
      <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
      <Input {...args} className='pl-10' />
    </div>
  ),
  args: {
    placeholder: 'Search...',
  },
}

export const WithTrailingIcon: Story = {
  render: args => (
    <div className='relative'>
      <Input {...args} className='pr-10' />
      <Mail className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
    </div>
  ),
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
}

// 密码输入框带显示/隐藏功能
export const PasswordWithToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className='relative'>
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder='Enter password'
          className='pr-10'
        />
        <button
          type='button'
          onClick={() => setShowPassword(!showPassword)}
          className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground'
        >
          {showPassword ? (
            <EyeOff className='h-4 w-4' />
          ) : (
            <Eye className='h-4 w-4' />
          )}
        </button>
      </div>
    )
  },
}

// 验证状态
export const WithError: Story = {
  render: args => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='email-error'>Email</Label>
      <Input {...args} id='email-error' aria-invalid='true' />
      <p className='text-sm text-destructive'>
        Please enter a valid email address.
      </p>
    </div>
  ),
  args: {
    type: 'email',
    placeholder: 'Email',
    value: 'invalid-email',
  },
}

export const WithSuccess: Story = {
  render: args => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='email-success'>Email</Label>
      <Input
        {...args}
        id='email-success'
        className='border-green-500 focus-visible:ring-green-500'
      />
      <p className='text-sm text-green-600'>Email is available!</p>
    </div>
  ),
  args: {
    type: 'email',
    placeholder: 'Email',
    value: 'user@example.com',
  },
}

// 尺寸展示
export const Sizes: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-4'>
      <Input placeholder='Default size' />
      <Input placeholder='Small size' className='h-8 text-sm' />
      <Input placeholder='Large size' className='h-12 text-lg' />
    </div>
  ),
}

// 表单示例
export const FormExample: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-4'>
      <div className='grid gap-1.5'>
        <Label htmlFor='name'>Name</Label>
        <Input id='name' placeholder='Your name' />
      </div>

      <div className='grid gap-1.5'>
        <Label htmlFor='email'>Email</Label>
        <Input id='email' type='email' placeholder='your.email@example.com' />
      </div>

      <div className='grid gap-1.5'>
        <Label htmlFor='phone'>Phone</Label>
        <Input id='phone' type='tel' placeholder='+1 (555) 123-4567' />
      </div>

      <div className='grid gap-1.5'>
        <Label htmlFor='website'>Website</Label>
        <Input id='website' type='url' placeholder='https://example.com' />
      </div>
    </div>
  ),
}
