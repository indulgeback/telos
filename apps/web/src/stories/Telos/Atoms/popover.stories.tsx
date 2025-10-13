import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/atoms/popover'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { Calendar, HelpCircle, Settings } from 'lucide-react'

const meta = {
  title: 'Telos/Atoms/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays rich content in a portal, triggered by a button. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

// 基础弹出框
export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className='space-y-2'>
          <h4 className='font-medium leading-none'>Popover Title</h4>
          <p className='text-sm text-muted-foreground'>
            This is a popover with some content inside.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

// 带表单
export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Open Form</Button>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='grid gap-4'>
          <div className='space-y-2'>
            <h4 className='font-medium leading-none'>Dimensions</h4>
            <p className='text-sm text-muted-foreground'>
              Set the dimensions for the layer.
            </p>
          </div>
          <div className='grid gap-2'>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='width'>Width</Label>
              <Input
                id='width'
                defaultValue='100%'
                className='col-span-2 h-8'
              />
            </div>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='maxWidth'>Max. width</Label>
              <Input
                id='maxWidth'
                defaultValue='300px'
                className='col-span-2 h-8'
              />
            </div>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='height'>Height</Label>
              <Input
                id='height'
                defaultValue='25px'
                className='col-span-2 h-8'
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

// 不同位置
export const Positions: Story = {
  render: () => (
    <div className='flex gap-4 flex-col items-center'>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline'>Top</Button>
        </PopoverTrigger>
        <PopoverContent side='top'>
          <p className='text-sm'>Content on top</p>
        </PopoverContent>
      </Popover>

      <div className='flex gap-4'>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant='outline'>Left</Button>
          </PopoverTrigger>
          <PopoverContent side='left'>
            <p className='text-sm'>Content on left</p>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant='outline'>Right</Button>
          </PopoverTrigger>
          <PopoverContent side='right'>
            <p className='text-sm'>Content on right</p>
          </PopoverContent>
        </Popover>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline'>Bottom</Button>
        </PopoverTrigger>
        <PopoverContent side='bottom'>
          <p className='text-sm'>Content on bottom</p>
        </PopoverContent>
      </Popover>
    </div>
  ),
}

// 帮助信息
export const HelpInfo: Story = {
  render: () => (
    <div className='flex items-center gap-2'>
      <Label>Email Address</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='text-muted-foreground hover:text-foreground'
          >
            <HelpCircle className='h-4 w-4' />
          </button>
        </PopoverTrigger>
        <PopoverContent className='w-80'>
          <div className='space-y-2'>
            <h4 className='font-medium'>Email Requirements</h4>
            <p className='text-sm text-muted-foreground'>
              Your email must be a valid format and will be used for account
              recovery and notifications.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
}

// 日期选择器风格
export const DatePicker: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' className='w-[240px] justify-start text-left'>
          <Calendar className='mr-2 h-4 w-4' />
          Pick a date
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <div className='p-4'>
          <p className='text-sm text-muted-foreground'>
            Calendar component would go here
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

// 设置菜单
export const SettingsMenu: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button size='icon' variant='outline'>
          <Settings className='h-4 w-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-56'>
        <div className='grid gap-4'>
          <div className='space-y-2'>
            <h4 className='font-medium leading-none'>Settings</h4>
          </div>
          <div className='grid gap-2'>
            <div className='flex items-center justify-between'>
              <label className='text-sm'>Notifications</label>
              <input type='checkbox' className='rounded' defaultChecked />
            </div>
            <div className='flex items-center justify-between'>
              <label className='text-sm'>Auto-save</label>
              <input type='checkbox' className='rounded' />
            </div>
            <div className='flex items-center justify-between'>
              <label className='text-sm'>Dark mode</label>
              <input type='checkbox' className='rounded' />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

// 分享选项
export const ShareOptions: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Share</Button>
      </PopoverTrigger>
      <PopoverContent className='w-64'>
        <div className='grid gap-4'>
          <div className='space-y-2'>
            <h4 className='font-medium'>Share this document</h4>
            <p className='text-sm text-muted-foreground'>
              Anyone with the link can view
            </p>
          </div>
          <div className='flex gap-2'>
            <Input value='https://example.com/doc' readOnly />
            <Button size='sm'>Copy</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

// 用户信息卡片
export const UserCard: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground'
        >
          JD
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='grid gap-4'>
          <div className='flex items-start gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg'>
              JD
            </div>
            <div className='flex-1 space-y-1'>
              <h4 className='text-sm font-semibold'>John Doe</h4>
              <p className='text-sm text-muted-foreground'>john@example.com</p>
            </div>
          </div>
          <div className='grid gap-2'>
            <Button variant='outline' size='sm'>
              View Profile
            </Button>
            <Button variant='outline' size='sm'>
              Send Message
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}
