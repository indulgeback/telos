import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar'

const meta = {
  title: 'Telos/Atoms/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An avatar component built with Radix UI. Displays user profile pictures with fallback support.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

// 基础头像
export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src='https://github.com/shadcn.png' alt='@shadcn' />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
}

// 仅显示fallback
export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
}

// 无效图片显示fallback
export const WithBrokenImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src='https://broken-link.com/image.jpg' alt='Broken' />
      <AvatarFallback>BK</AvatarFallback>
    </Avatar>
  ),
}

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Avatar className='h-8 w-8'>
        <AvatarImage src='https://github.com/shadcn.png' />
        <AvatarFallback className='text-xs'>S</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src='https://github.com/shadcn.png' />
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <Avatar className='h-12 w-12'>
        <AvatarImage src='https://github.com/shadcn.png' />
        <AvatarFallback>L</AvatarFallback>
      </Avatar>
      <Avatar className='h-16 w-16'>
        <AvatarImage src='https://github.com/shadcn.png' />
        <AvatarFallback className='text-lg'>XL</AvatarFallback>
      </Avatar>
    </div>
  ),
}

// 头像组
export const AvatarGroup: Story = {
  render: () => (
    <div className='flex -space-x-2'>
      <Avatar className='border-2 border-background'>
        <AvatarImage src='https://github.com/shadcn.png' />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar className='border-2 border-background'>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar className='border-2 border-background'>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
      <Avatar className='border-2 border-background'>
        <AvatarFallback>+2</AvatarFallback>
      </Avatar>
    </div>
  ),
}
