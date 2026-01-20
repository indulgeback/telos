/* eslint-disable @next/next/no-img-element */
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/atoms/hover-card'
import { Button } from '@/components/atoms/button'
import { CalendarDays } from 'lucide-react'

const meta = {
  title: 'Telos/Atoms/HoverCard',
  component: HoverCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'For sighted users to preview content available behind a link. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof HoverCard>

export default meta
type Story = StoryObj<typeof meta>

// 基础悬停卡片
export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant='link'>@nextjs</Button>
      </HoverCardTrigger>
      <HoverCardContent className='w-80'>
        <div className='flex justify-between space-x-4'>
          <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            N
          </div>
          <div className='space-y-1'>
            <h4 className='text-sm font-semibold'>@nextjs</h4>
            <p className='text-sm text-muted-foreground'>
              The React Framework – created and maintained by @vercel.
            </p>
            <div className='flex items-center pt-2'>
              <CalendarDays className='mr-2 h-4 w-4 opacity-70' />
              <span className='text-xs text-muted-foreground'>
                Joined December 2021
              </span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}

// 用户卡片
export const UserProfile: Story = {
  render: () => (
    <div className='text-sm'>
      Hover over{' '}
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant='link' className='p-0 h-auto font-semibold'>
            @shadcn
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className='w-80'>
          <div className='flex space-x-4'>
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold'>
              S
            </div>
            <div className='space-y-2 flex-1'>
              <div>
                <h4 className='text-sm font-semibold'>shadcn</h4>
                <p className='text-sm text-muted-foreground'>@shadcn</p>
              </div>
              <p className='text-sm'>
                Building @shadcn/ui - A collection of re-usable components.
              </p>
              <div className='flex gap-4 text-xs text-muted-foreground'>
                <div>
                  <span className='font-semibold text-foreground'>1.2k</span>{' '}
                  Following
                </div>
                <div>
                  <span className='font-semibold text-foreground'>4.5k</span>{' '}
                  Followers
                </div>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>{' '}
      to see more information.
    </div>
  ),
}

// 链接预览
export const LinkPreview: Story = {
  render: () => (
    <div className='text-sm max-w-md'>
      Check out{' '}
      <HoverCard>
        <HoverCardTrigger asChild>
          <a
            href='#'
            className='font-medium text-primary underline underline-offset-4'
          >
            this article
          </a>
        </HoverCardTrigger>
        <HoverCardContent className='w-80'>
          <div className='space-y-2'>
            <img
              src='https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=200&fit=crop'
              alt='Article preview'
              className='w-full h-32 object-cover rounded-md'
            />
            <div className='space-y-1'>
              <h4 className='text-sm font-semibold'>
                10 Tips for Better React Code
              </h4>
              <p className='text-xs text-muted-foreground'>
                Learn how to write cleaner, more maintainable React code with
                these proven techniques...
              </p>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <span>5 min read</span>
                <span>•</span>
                <span>Mar 15, 2024</span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>{' '}
      for more details.
    </div>
  ),
}

// 产品预览
export const ProductPreview: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className='cursor-pointer rounded-lg border p-4 hover:bg-accent'>
          <h3 className='font-semibold'>Wireless Headphones</h3>
          <p className='text-sm text-muted-foreground'>$299.99</p>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className='w-96'>
        <div className='space-y-3'>
          <img
            src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop'
            alt='Product'
            className='w-full h-48 object-cover rounded-md'
          />
          <div className='space-y-2'>
            <h4 className='font-semibold'>Premium Wireless Headphones</h4>
            <p className='text-sm text-muted-foreground'>
              High-quality sound with active noise cancellation. 30-hour battery
              life.
            </p>
            <div className='flex items-center justify-between'>
              <span className='text-xl font-bold'>$299.99</span>
              <div className='flex items-center gap-1'>
                <span className='text-yellow-500'>★★★★★</span>
                <span className='text-xs text-muted-foreground'>(128)</span>
              </div>
            </div>
            <Button className='w-full' size='sm'>
              Add to Cart
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}

// 多个悬停卡片
export const MultipleCards: Story = {
  render: () => (
    <div className='flex gap-4'>
      {['Alice', 'Bob', 'Charlie'].map(name => (
        <HoverCard key={name}>
          <HoverCardTrigger asChild>
            <div className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground'>
              {name[0]}
            </div>
          </HoverCardTrigger>
          <HoverCardContent>
            <div className='space-y-2'>
              <h4 className='text-sm font-semibold'>{name}</h4>
              <p className='text-sm text-muted-foreground'>
                {name.toLowerCase()}@example.com
              </p>
              <p className='text-xs text-muted-foreground'>
                Software Engineer at Company Inc.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
}
