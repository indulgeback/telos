import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Skeleton } from '@/components/atoms/skeleton'

const meta = {
  title: 'Telos/Atoms/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A skeleton loader component that displays a placeholder while content is loading. Features a pulsing animation effect.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

// 基础骨架屏
export const Default: Story = {
  render: () => <Skeleton className='h-12 w-64' />,
}

// 圆形骨架屏
export const Circle: Story = {
  render: () => <Skeleton className='h-12 w-12 rounded-full' />,
}

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className='space-y-4'>
      <Skeleton className='h-4 w-32' />
      <Skeleton className='h-6 w-48' />
      <Skeleton className='h-8 w-64' />
      <Skeleton className='h-12 w-80' />
    </div>
  ),
}

// 头像骨架屏
export const Avatar: Story = {
  render: () => (
    <div className='flex items-center space-x-4'>
      <Skeleton className='h-12 w-12 rounded-full' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-[250px]' />
        <Skeleton className='h-4 w-[200px]' />
      </div>
    </div>
  ),
}

// 卡片骨架屏
export const Card: Story = {
  render: () => (
    <div className='flex flex-col space-y-3 w-[350px]'>
      <Skeleton className='h-[200px] w-full rounded-xl' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-4/5' />
      </div>
    </div>
  ),
}

// 文章骨架屏
export const Article: Story = {
  render: () => (
    <div className='w-[600px] space-y-4'>
      <Skeleton className='h-8 w-3/4' />
      <Skeleton className='h-4 w-1/4' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-4/5' />
      </div>
      <Skeleton className='h-[300px] w-full' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
      </div>
    </div>
  ),
}

// 列表骨架屏
export const List: Story = {
  render: () => (
    <div className='w-[400px] space-y-4'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-center space-x-4'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='space-y-2 flex-1'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
          </div>
        </div>
      ))}
    </div>
  ),
}

// 表格骨架屏
export const Table: Story = {
  render: () => (
    <div className='w-[700px] space-y-3'>
      <div className='flex space-x-4'>
        <Skeleton className='h-10 flex-1' />
        <Skeleton className='h-10 flex-1' />
        <Skeleton className='h-10 flex-1' />
        <Skeleton className='h-10 w-24' />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex space-x-4'>
          <Skeleton className='h-12 flex-1' />
          <Skeleton className='h-12 flex-1' />
          <Skeleton className='h-12 flex-1' />
          <Skeleton className='h-12 w-24' />
        </div>
      ))}
    </div>
  ),
}

// 个人资料骨架屏
export const Profile: Story = {
  render: () => (
    <div className='w-[500px]'>
      <div className='flex flex-col items-center space-y-4'>
        <Skeleton className='h-32 w-32 rounded-full' />
        <div className='space-y-2 text-center w-full'>
          <Skeleton className='h-6 w-48 mx-auto' />
          <Skeleton className='h-4 w-32 mx-auto' />
        </div>
        <div className='flex space-x-4 w-full justify-center'>
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-24' />
          <Skeleton className='h-10 w-24' />
        </div>
        <div className='w-full space-y-2 mt-6'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
        </div>
      </div>
    </div>
  ),
}

// 评论骨架屏
export const Comment: Story = {
  render: () => (
    <div className='w-[500px] space-y-4'>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className='flex space-x-3'>
          <Skeleton className='h-10 w-10 rounded-full flex-shrink-0' />
          <div className='flex-1 space-y-2'>
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-3 w-16' />
            </div>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
          </div>
        </div>
      ))}
    </div>
  ),
}

// 产品卡片骨架屏
export const ProductCard: Story = {
  render: () => (
    <div className='grid grid-cols-3 gap-4 w-[700px]'>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='flex flex-col space-y-3'>
          <Skeleton className='h-[200px] w-full rounded-lg' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-2/3' />
          <div className='flex justify-between items-center'>
            <Skeleton className='h-6 w-16' />
            <Skeleton className='h-8 w-20' />
          </div>
        </div>
      ))}
    </div>
  ),
}

// 仪表板骨架屏
export const Dashboard: Story = {
  render: () => (
    <div className='w-[800px] space-y-6'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-10 w-32' />
      </div>

      <div className='grid grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='flex flex-col space-y-2 p-4 border rounded-lg'
          >
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-16' />
            <Skeleton className='h-3 w-20' />
          </div>
        ))}
      </div>

      <div className='space-y-4'>
        <Skeleton className='h-6 w-32' />
        <Skeleton className='h-[300px] w-full rounded-lg' />
      </div>
    </div>
  ),
}

// 邮件列表骨架屏
export const EmailList: Story = {
  render: () => (
    <div className='w-[600px] border rounded-lg divide-y'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='p-4 space-y-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center space-x-3 flex-1'>
              <Skeleton className='h-10 w-10 rounded-full' />
              <div className='space-y-2 flex-1'>
                <div className='flex items-center justify-between'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-16' />
                </div>
                <Skeleton className='h-4 w-full' />
              </div>
            </div>
          </div>
          <Skeleton className='h-3 w-5/6' />
        </div>
      ))}
    </div>
  ),
}

// 日历骨架屏
export const Calendar: Story = {
  render: () => (
    <div className='w-[600px] space-y-4'>
      <div className='flex justify-between items-center'>
        <Skeleton className='h-8 w-48' />
        <div className='flex space-x-2'>
          <Skeleton className='h-8 w-8' />
          <Skeleton className='h-8 w-8' />
        </div>
      </div>
      <div className='grid grid-cols-7 gap-2'>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className='h-8 w-full' />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className='h-16 w-full' />
        ))}
      </div>
    </div>
  ),
}

// 聊天消息骨架屏
export const ChatMessages: Story = {
  render: () => (
    <div className='w-[500px] space-y-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
        >
          <div
            className={`flex items-start space-x-2 ${i % 2 === 1 ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <Skeleton className='h-8 w-8 rounded-full flex-shrink-0' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-32' />
              <Skeleton
                className={`h-16 ${i % 2 === 0 ? 'w-[280px]' : 'w-[240px]'}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
}
