import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Separator } from '@/components/atoms/separator'

const meta = {
  title: 'Telos/Atoms/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A visual or semantic separator between content sections. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    decorative: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

// 水平分隔符
export const Horizontal: Story = {
  render: () => (
    <div className='w-80'>
      <div className='space-y-4'>
        <p className='text-sm'>Content above the separator</p>
        <Separator />
        <p className='text-sm'>Content below the separator</p>
      </div>
    </div>
  ),
}

// 垂直分隔符
export const Vertical: Story = {
  render: () => (
    <div className='flex h-20 items-center space-x-4'>
      <div className='text-sm'>Left content</div>
      <Separator orientation='vertical' />
      <div className='text-sm'>Right content</div>
    </div>
  ),
}

// 在文本中使用
export const InText: Story = {
  render: () => (
    <div className='w-96'>
      <div className='space-y-1'>
        <h4 className='text-sm font-medium leading-none'>Radix Primitives</h4>
        <p className='text-sm text-muted-foreground'>
          An open-source UI component library.
        </p>
      </div>
      <Separator className='my-4' />
      <div className='flex h-5 items-center space-x-4 text-sm'>
        <div>Blog</div>
        <Separator orientation='vertical' />
        <div>Docs</div>
        <Separator orientation='vertical' />
        <div>Source</div>
      </div>
    </div>
  ),
}

// 导航菜单中使用
export const InNavigation: Story = {
  render: () => (
    <div className='w-80'>
      <div className='flex h-12 items-center space-x-4 px-4'>
        <a href='#' className='text-sm font-medium hover:underline'>
          Home
        </a>
        <Separator orientation='vertical' />
        <a href='#' className='text-sm font-medium hover:underline'>
          About
        </a>
        <Separator orientation='vertical' />
        <a href='#' className='text-sm font-medium hover:underline'>
          Contact
        </a>
      </div>
    </div>
  ),
}

// 卡片中使用
export const InCard: Story = {
  render: () => (
    <div className='w-96 rounded-lg border p-6'>
      <div className='space-y-4'>
        <div>
          <h3 className='text-lg font-semibold'>Account Settings</h3>
          <p className='text-sm text-muted-foreground'>
            Manage your account preferences
          </p>
        </div>

        <Separator />

        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm'>Email Notifications</span>
            <input type='checkbox' className='rounded' defaultChecked />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <span className='text-sm'>Push Notifications</span>
            <input type='checkbox' className='rounded' />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <span className='text-sm'>SMS Notifications</span>
            <input type='checkbox' className='rounded' />
          </div>
        </div>

        <Separator />

        <div className='flex justify-end space-x-2'>
          <button
            type='button'
            className='inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent'
          >
            Cancel
          </button>
          <button
            type='button'
            className='inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90'
          >
            Save
          </button>
        </div>
      </div>
    </div>
  ),
}

// 列表中使用
export const InList: Story = {
  render: () => (
    <div className='w-80 rounded-lg border'>
      <div className='p-4'>
        <h3 className='font-semibold mb-2'>Recent Activity</h3>
        <div className='space-y-0'>
          <div className='py-3'>
            <p className='text-sm font-medium'>Project created</p>
            <p className='text-xs text-muted-foreground'>2 hours ago</p>
          </div>
          <Separator />
          <div className='py-3'>
            <p className='text-sm font-medium'>File uploaded</p>
            <p className='text-xs text-muted-foreground'>5 hours ago</p>
          </div>
          <Separator />
          <div className='py-3'>
            <p className='text-sm font-medium'>Comment added</p>
            <p className='text-xs text-muted-foreground'>1 day ago</p>
          </div>
          <Separator />
          <div className='py-3'>
            <p className='text-sm font-medium'>Team member invited</p>
            <p className='text-xs text-muted-foreground'>2 days ago</p>
          </div>
        </div>
      </div>
    </div>
  ),
}

// 侧边栏布局
export const InSidebar: Story = {
  render: () => (
    <div className='flex h-96 w-96 rounded-lg border'>
      <div className='w-48 border-r p-4'>
        <h3 className='font-semibold mb-4'>Navigation</h3>
        <nav className='space-y-2'>
          <a
            href='#'
            className='block py-2 text-sm hover:bg-accent rounded px-2'
          >
            Dashboard
          </a>
          <a
            href='#'
            className='block py-2 text-sm hover:bg-accent rounded px-2'
          >
            Projects
          </a>
          <a
            href='#'
            className='block py-2 text-sm hover:bg-accent rounded px-2'
          >
            Tasks
          </a>
          <Separator className='my-2' />
          <a
            href='#'
            className='block py-2 text-sm hover:bg-accent rounded px-2'
          >
            Settings
          </a>
          <a
            href='#'
            className='block py-2 text-sm hover:bg-accent rounded px-2'
          >
            Help
          </a>
        </nav>
      </div>
      <div className='flex-1 p-6'>
        <h2 className='text-xl font-bold mb-2'>Main Content</h2>
        <p className='text-sm text-muted-foreground'>
          Content area with vertical separator
        </p>
      </div>
    </div>
  ),
}

// 自定义样式
export const CustomStyles: Story = {
  render: () => (
    <div className='w-80 space-y-6'>
      <div>
        <p className='text-sm mb-2'>Default separator</p>
        <Separator />
      </div>

      <div>
        <p className='text-sm mb-2'>Thicker separator</p>
        <Separator className='h-0.5' />
      </div>

      <div>
        <p className='text-sm mb-2'>Colored separator</p>
        <Separator className='bg-primary' />
      </div>

      <div>
        <p className='text-sm mb-2'>Dashed separator</p>
        <Separator className='border-t border-dashed bg-transparent' />
      </div>

      <div>
        <p className='text-sm mb-2'>Gradient separator</p>
        <Separator className='h-px bg-gradient-to-r from-transparent via-border to-transparent' />
      </div>
    </div>
  ),
}

// 表单分组
export const FormSections: Story = {
  render: () => (
    <div className='w-96 space-y-6 p-6 rounded-lg border'>
      <div>
        <h2 className='text-lg font-semibold mb-4'>User Profile</h2>

        <div className='space-y-4'>
          <h3 className='text-sm font-medium'>Personal Information</h3>
          <div className='space-y-2'>
            <div>
              <label className='text-sm'>First Name</label>
              <input
                type='text'
                className='w-full mt-1 px-3 py-2 border rounded-md text-sm'
                placeholder='John'
              />
            </div>
            <div>
              <label className='text-sm'>Last Name</label>
              <input
                type='text'
                className='w-full mt-1 px-3 py-2 border rounded-md text-sm'
                placeholder='Doe'
              />
            </div>
          </div>
        </div>

        <Separator className='my-6' />

        <div className='space-y-4'>
          <h3 className='text-sm font-medium'>Contact Details</h3>
          <div className='space-y-2'>
            <div>
              <label className='text-sm'>Email</label>
              <input
                type='email'
                className='w-full mt-1 px-3 py-2 border rounded-md text-sm'
                placeholder='john@example.com'
              />
            </div>
            <div>
              <label className='text-sm'>Phone</label>
              <input
                type='tel'
                className='w-full mt-1 px-3 py-2 border rounded-md text-sm'
                placeholder='+1 (555) 123-4567'
              />
            </div>
          </div>
        </div>

        <Separator className='my-6' />

        <div className='flex justify-end space-x-2'>
          <button
            type='button'
            className='inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent'
          >
            Cancel
          </button>
          <button
            type='button'
            className='inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90'
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  ),
}

// 页眉/页脚分隔
export const HeaderFooter: Story = {
  render: () => (
    <div className='w-[600px] rounded-lg border'>
      <div className='p-4'>
        <h2 className='text-lg font-semibold'>Document Title</h2>
        <p className='text-sm text-muted-foreground'>Subtitle or description</p>
      </div>

      <Separator />

      <div className='p-6 min-h-[200px]'>
        <p className='text-sm'>
          Main content area. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
          aliqua.
        </p>
      </div>

      <Separator />

      <div className='p-4 flex justify-between items-center'>
        <p className='text-xs text-muted-foreground'>
          Last updated: 2 hours ago
        </p>
        <div className='flex space-x-2'>
          <button type='button' className='text-sm hover:underline'>
            Share
          </button>
          <button type='button' className='text-sm hover:underline'>
            Export
          </button>
        </div>
      </div>
    </div>
  ),
}
