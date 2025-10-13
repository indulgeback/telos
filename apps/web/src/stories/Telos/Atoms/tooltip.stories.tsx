import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/atoms/tooltip'
import { Button } from '@/components/atoms/button'
import { Plus, Settings, HelpCircle, Info as InfoIcon } from 'lucide-react'

const meta = {
  title: 'Telos/Atoms/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it. Built with Radix UI primitives.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

// 基础提示框
export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant='outline'>Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
}

// 不同位置
export const Positions: Story = {
  render: () => (
    <div className='flex gap-4 flex-col items-center'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>Top</Button>
        </TooltipTrigger>
        <TooltipContent side='top'>
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>

      <div className='flex gap-4'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='outline'>Left</Button>
          </TooltipTrigger>
          <TooltipContent side='left'>
            <p>Tooltip on left</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='outline'>Right</Button>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p>Tooltip on right</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side='bottom'>
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}

// 图标按钮提示
export const IconButtons: Story = {
  render: () => (
    <div className='flex gap-4'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='icon' variant='outline'>
            <Plus className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add new item</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='icon' variant='outline'>
            <Settings className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='icon' variant='outline'>
            <HelpCircle className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Help & Support</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}

// 长文本提示
export const LongText: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant='outline'>Hover for details</Button>
      </TooltipTrigger>
      <TooltipContent className='max-w-xs'>
        <p>
          This is a longer tooltip that contains more detailed information. It
          automatically wraps to multiple lines when needed.
        </p>
      </TooltipContent>
    </Tooltip>
  ),
}

// 带快捷键
export const WithShortcut: Story = {
  render: () => (
    <div className='flex gap-4'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>Save</Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className='flex items-center gap-2'>
            <span>Save</span>
            <kbd className='px-1.5 py-0.5 text-xs rounded bg-background/20 border'>
              ⌘S
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>Copy</Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className='flex items-center gap-2'>
            <span>Copy</span>
            <kbd className='px-1.5 py-0.5 text-xs rounded bg-background/20 border'>
              ⌘C
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline'>Paste</Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className='flex items-center gap-2'>
            <span>Paste</span>
            <kbd className='px-1.5 py-0.5 text-xs rounded bg-background/20 border'>
              ⌘V
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}

// 表单字段帮助
export const FormFieldHelp: Story = {
  render: () => (
    <div className='w-80 space-y-4'>
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <label className='text-sm font-medium'>Username</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground'
              >
                <InfoIcon className='h-3.5 w-3.5' />
              </button>
            </TooltipTrigger>
            <TooltipContent className='max-w-xs'>
              <p>
                Your username must be 3-20 characters long and can only contain
                letters, numbers, and underscores.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <input
          type='text'
          placeholder='Enter username'
          className='w-full px-3 py-2 border rounded-md text-sm'
        />
      </div>

      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <label className='text-sm font-medium'>Password</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground'
              >
                <InfoIcon className='h-3.5 w-3.5' />
              </button>
            </TooltipTrigger>
            <TooltipContent className='max-w-xs'>
              <p>
                Password must contain at least 8 characters, including
                uppercase, lowercase, number, and special character.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <input
          type='password'
          placeholder='Enter password'
          className='w-full px-3 py-2 border rounded-md text-sm'
        />
      </div>
    </div>
  ),
}

// 禁用元素
export const DisabledElement: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button disabled>Disabled Button</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>This action is currently unavailable</p>
      </TooltipContent>
    </Tooltip>
  ),
}

// 工具栏
export const Toolbar: Story = {
  render: () => (
    <div className='flex items-center gap-1 p-2 border rounded-lg bg-background'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='sm' variant='ghost'>
            <strong>B</strong>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Bold (⌘B)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='sm' variant='ghost'>
            <em>I</em>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Italic (⌘I)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='sm' variant='ghost'>
            <u>U</u>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Underline (⌘U)</p>
        </TooltipContent>
      </Tooltip>

      <div className='w-px h-6 bg-border mx-1' />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='sm' variant='ghost'>
            🔗
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert Link (⌘K)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size='sm' variant='ghost'>
            🖼️
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert Image</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}

// 图表数据点
export const ChartDataPoint: Story = {
  render: () => (
    <div className='flex items-end gap-2 h-40 p-4 border rounded-lg'>
      {[65, 80, 45, 90, 70, 55, 85].map((value, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <div
              className='w-12 bg-primary rounded-t cursor-pointer hover:opacity-80'
              style={{ height: `${value}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Day {i + 1}: {value}%
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}

// 头像信息
export const AvatarInfo: Story = {
  render: () => (
    <div className='flex gap-2'>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground cursor-pointer'>
            JD
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div>
            <p className='font-semibold'>John Doe</p>
            <p className='text-xs text-primary-foreground/80'>
              john@example.com
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground cursor-pointer'>
            SM
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div>
            <p className='font-semibold'>Sarah Miller</p>
            <p className='text-xs text-primary-foreground/80'>
              sarah@example.com
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}

// 状态指示器
export const StatusIndicator: Story = {
  render: () => (
    <div className='flex gap-4'>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer'>
            <div className='h-2 w-2 rounded-full bg-green-500' />
            <span className='text-sm'>Online</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>All systems operational</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer'>
            <div className='h-2 w-2 rounded-full bg-yellow-500' />
            <span className='text-sm'>Warning</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Some issues detected</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer'>
            <div className='h-2 w-2 rounded-full bg-red-500' />
            <span className='text-sm'>Offline</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>System unavailable</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}
