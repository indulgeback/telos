/* eslint-disable @next/next/no-img-element */
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AspectRatio } from '@/components/atoms/aspect-ratio'

const meta = {
  title: 'Telos/Atoms/AspectRatio',
  component: AspectRatio,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays content within a desired ratio. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof AspectRatio>

export default meta
type Story = StoryObj<typeof meta>

// 16:9 比例
export const SixteenByNine: Story = {
  render: () => (
    <div className='w-[450px]'>
      <AspectRatio ratio={16 / 9}>
        <img
          src='https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80'
          alt='Photo by Drew Beamer'
          className='rounded-md object-cover w-full h-full'
        />
      </AspectRatio>
    </div>
  ),
}

// 4:3 比例
export const FourByThree: Story = {
  render: () => (
    <div className='w-[450px]'>
      <AspectRatio ratio={4 / 3}>
        <img
          src='https://images.unsplash.com/photo-1535025183601-9477c0d372b0?w=800&dpr=2&q=80'
          alt='Landscape'
          className='rounded-md object-cover w-full h-full'
        />
      </AspectRatio>
    </div>
  ),
}

// 1:1 正方形
export const Square: Story = {
  render: () => (
    <div className='w-[300px]'>
      <AspectRatio ratio={1}>
        <img
          src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&dpr=2&q=80'
          alt='Portrait'
          className='rounded-md object-cover w-full h-full'
        />
      </AspectRatio>
    </div>
  ),
}

// 21:9 超宽比例
export const UltraWide: Story = {
  render: () => (
    <div className='w-[600px]'>
      <AspectRatio ratio={21 / 9}>
        <img
          src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&dpr=2&q=80'
          alt='Mountain landscape'
          className='rounded-md object-cover w-full h-full'
        />
      </AspectRatio>
    </div>
  ),
}

// 视频播放器
export const VideoPlayer: Story = {
  render: () => (
    <div className='w-[560px]'>
      <AspectRatio ratio={16 / 9} className='bg-muted'>
        <div className='flex items-center justify-center w-full h-full'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='currentColor'
                className='w-8 h-8 text-primary-foreground'
              >
                <path d='M8 5v14l11-7z' />
              </svg>
            </div>
            <p className='text-sm font-medium'>Video Player</p>
            <p className='text-xs text-muted-foreground'>16:9 aspect ratio</p>
          </div>
        </div>
      </AspectRatio>
    </div>
  ),
}

// 带边框的图片
export const WithBorder: Story = {
  render: () => (
    <div className='w-[400px]'>
      <AspectRatio ratio={16 / 9}>
        <div className='w-full h-full border-4 border-border rounded-lg overflow-hidden'>
          <img
            src='https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&dpr=2&q=80'
            alt='Colorful'
            className='object-cover w-full h-full'
          />
        </div>
      </AspectRatio>
    </div>
  ),
}

// 多个比例对比
export const MultipleRatios: Story = {
  render: () => (
    <div className='space-y-6 w-[500px]'>
      <div>
        <p className='text-sm font-medium mb-2'>16:9 (Widescreen)</p>
        <AspectRatio ratio={16 / 9} className='bg-muted rounded-md' />
      </div>
      <div>
        <p className='text-sm font-medium mb-2'>4:3 (Standard)</p>
        <AspectRatio ratio={4 / 3} className='bg-muted rounded-md' />
      </div>
      <div>
        <p className='text-sm font-medium mb-2'>1:1 (Square)</p>
        <AspectRatio ratio={1} className='bg-muted rounded-md' />
      </div>
      <div>
        <p className='text-sm font-medium mb-2'>9:16 (Portrait)</p>
        <AspectRatio ratio={9 / 16} className='bg-muted rounded-md' />
      </div>
    </div>
  ),
}

// 图片网格
export const ImageGrid: Story = {
  render: () => (
    <div className='grid grid-cols-3 gap-4 w-[600px]'>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <AspectRatio key={i} ratio={1}>
          <div className='w-full h-full bg-muted rounded-md flex items-center justify-center'>
            <span className='text-2xl font-bold text-muted-foreground'>
              {i}
            </span>
          </div>
        </AspectRatio>
      ))}
    </div>
  ),
}

// 响应式图片
export const ResponsiveImage: Story = {
  render: () => (
    <div className='w-full max-w-2xl'>
      <AspectRatio ratio={16 / 9}>
        <img
          src='https://images.unsplash.com/photo-1682687220923-c58b9a4592ae?w=800&dpr=2&q=80'
          alt='Responsive'
          className='rounded-lg object-cover w-full h-full'
        />
      </AspectRatio>
      <p className='text-sm text-muted-foreground mt-2'>
        This image maintains its 16:9 aspect ratio regardless of container width
      </p>
    </div>
  ),
}

// 带内容覆盖
export const WithOverlay: Story = {
  render: () => (
    <div className='w-[450px]'>
      <AspectRatio ratio={16 / 9} className='relative'>
        <img
          src='https://images.unsplash.com/photo-1682687220795-796d3f6f7000?w=800&dpr=2&q=80'
          alt='With overlay'
          className='rounded-md object-cover w-full h-full'
        />
        <div className='absolute inset-0 bg-black/40 rounded-md flex items-center justify-center'>
          <div className='text-center text-white'>
            <h3 className='text-2xl font-bold mb-2'>Overlay Content</h3>
            <p className='text-sm'>Perfect for hero sections</p>
          </div>
        </div>
      </AspectRatio>
    </div>
  ),
}
