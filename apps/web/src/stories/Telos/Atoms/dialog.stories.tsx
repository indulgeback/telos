import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { useState } from 'react'

const meta = {
  title: 'Telos/Atoms/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A modal dialog component that overlays the main content and focuses user attention on a specific task or message. Built with Radix UI primitives.',
      },
    },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

// 基础对话框
export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a description of what the dialog is about. You can add
            important information here.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p className='text-sm'>Dialog content goes here.</p>
        </div>
      </DialogContent>
    </Dialog>
  ),
}

// 带表单的对话框
export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Name</Label>
            <Input id='name' placeholder='Pedro Duarte' />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='username'>Username</Label>
            <Input id='username' placeholder='@peduarte' />
          </div>
        </div>
        <DialogFooter>
          <Button type='submit'>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 确认对话框
export const ConfirmDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='destructive'>Delete Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline'>Cancel</Button>
          <Button variant='destructive'>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 可控制的对话框
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div className='space-y-4'>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Open Controlled Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Controlled Dialog</DialogTitle>
              <DialogDescription>
                This dialog's open state is controlled by React state.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <p className='text-sm'>
                You can control when this dialog opens and closes
                programmatically.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className='text-sm text-muted-foreground'>
          Dialog is {open ? 'open' : 'closed'}
        </p>
      </div>
    )
  },
}

// 无关闭按钮
export const NoCloseButton: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open (No Close Button)</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Important Message</DialogTitle>
          <DialogDescription>
            You must make a choice to continue.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p className='text-sm'>
            This dialog has no close button. You must use the buttons below.
          </p>
        </div>
        <DialogFooter>
          <Button variant='outline'>Cancel</Button>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 带滚动内容的对话框
export const WithScrollableContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Long Dialog</Button>
      </DialogTrigger>
      <DialogContent className='max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Please read our terms of service carefully.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <h3 className='font-semibold mb-2'>Section {i + 1}</h3>
              <p className='text-sm text-muted-foreground'>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant='outline'>Decline</Button>
          <Button>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 登录表单对话框
export const LoginDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Sign In</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Enter your credentials to access your account.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' placeholder='your@email.com' />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='password'>Password</Label>
            <Input id='password' type='password' />
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='remember'
              className='rounded border-gray-300'
            />
            <Label htmlFor='remember' className='text-sm font-normal'>
              Remember me
            </Label>
          </div>
        </div>
        <DialogFooter className='flex-col sm:flex-col gap-2'>
          <Button type='submit' className='w-full'>
            Sign In
          </Button>
          <Button variant='outline' className='w-full'>
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 信息对话框
export const InfoDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>Show Info</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ℹ️ Information</DialogTitle>
          <DialogDescription>
            Here's some important information you should know.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <ul className='space-y-2 text-sm'>
            <li className='flex items-start gap-2'>
              <span className='text-primary'>•</span>
              <span>Your data is automatically saved</span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='text-primary'>•</span>
              <span>You can export your data at any time</span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='text-primary'>•</span>
              <span>All changes are versioned</span>
            </li>
          </ul>
        </div>
        <DialogFooter>
          <Button>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 自定义宽度
export const CustomWidth: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Wide Dialog</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Wide Dialog</DialogTitle>
          <DialogDescription>
            This dialog has a custom maximum width.
          </DialogDescription>
        </DialogHeader>
        <div className='py-6'>
          <p className='text-sm'>
            You can customize the width of the dialog by adding Tailwind CSS
            classes to the DialogContent component.
          </p>
        </div>
        <DialogFooter>
          <Button>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 创建项目对话框
export const CreateProject: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create New Project</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter the details for your new project.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='project-name'>Project Name</Label>
            <Input id='project-name' placeholder='My Awesome Project' />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='description'>Description</Label>
            <textarea
              id='description'
              placeholder='A brief description of your project'
              className='border-input placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]'
              rows={3}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='visibility'>Visibility</Label>
            <select
              id='visibility'
              className='border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]'
            >
              <option>Public</option>
              <option>Private</option>
              <option>Internal</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline'>Cancel</Button>
          <Button>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
