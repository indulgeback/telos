import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/atoms/card'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar'

const meta = {
  title: 'Telos/Atoms/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible card component with header, content, and footer sections. Perfect for displaying content in a structured layout.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

// 基础卡片
export const Default: Story = {
  render: () => (
    <Card className='w-80'>
      <CardContent className='p-6'>
        <p>This is a basic card with just content.</p>
      </CardContent>
    </Card>
  ),
}

// 带标题的卡片
export const WithHeader: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This can be any type of content.</p>
      </CardContent>
    </Card>
  ),
}

// 带标题和描述的卡片
export const WithHeaderAndDescription: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>
          This is a description that provides more context about the card
          content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This can be any type of content.</p>
      </CardContent>
    </Card>
  ),
}

// 完整的卡片
export const Complete: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader>
        <CardTitle>Complete Card</CardTitle>
        <CardDescription>
          A card with header, content, and footer sections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          This card demonstrates all the available sections: header with title
          and description, main content area, and footer with actions.
        </p>
      </CardContent>
      <CardFooter className='flex justify-between'>
        <Button variant='outline'>Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  ),
}

// 用户卡片示例
export const UserCard: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader className='flex flex-row items-center gap-4'>
        <Avatar>
          <AvatarImage src='https://github.com/shadcn.png' />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className='flex flex-col'>
          <CardTitle className='text-lg'>John Doe</CardTitle>
          <CardDescription>Software Engineer</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>
          Passionate about building great user experiences and solving complex
          problems with elegant solutions.
        </p>
        <div className='mt-4 flex gap-2'>
          <Badge variant='secondary'>React</Badge>
          <Badge variant='secondary'>TypeScript</Badge>
          <Badge variant='secondary'>Node.js</Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button className='w-full'>View Profile</Button>
      </CardFooter>
    </Card>
  ),
}

// 通知卡片
export const NotificationCard: Story = {
  render: () => (
    <Card className='w-80'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>New Message</CardTitle>
          <Badge>New</Badge>
        </div>
      </CardHeader>
      <CardContent className='pb-3'>
        <p className='text-sm'>
          You have received a new message from your team member.
        </p>
        <p className='text-xs text-muted-foreground mt-2'>2 minutes ago</p>
      </CardContent>
      <CardFooter className='pt-0'>
        <div className='flex gap-2 w-full'>
          <Button variant='outline' size='sm' className='flex-1'>
            Dismiss
          </Button>
          <Button size='sm' className='flex-1'>
            Read
          </Button>
        </div>
      </CardFooter>
    </Card>
  ),
}

// 产品卡片
export const ProductCard: Story = {
  render: () => (
    <Card className='w-80'>
      <div className='aspect-square w-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg' />
      <CardHeader>
        <div className='flex justify-between items-start'>
          <div>
            <CardTitle>Premium Headphones</CardTitle>
            <CardDescription>Wireless noise cancelling</CardDescription>
          </div>
          <Badge variant='secondary'>$299</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>
          High-quality audio experience with advanced noise cancellation
          technology.
        </p>
      </CardContent>
      <CardFooter>
        <Button className='w-full'>Add to Cart</Button>
      </CardFooter>
    </Card>
  ),
}
