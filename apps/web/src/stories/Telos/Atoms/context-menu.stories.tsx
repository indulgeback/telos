import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from '@/components/atoms/context-menu'
import {
  Copy,
  Scissors,
  ClipboardPaste,
  Download,
  Share,
  Trash,
  Edit,
  Star,
  Folder,
  File,
} from 'lucide-react'
import React from 'react'
import Image from 'next/image'

const meta = {
  title: 'Telos/Atoms/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays a menu at the pointer position when the trigger is right clicked. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof ContextMenu>

export default meta
type Story = StoryObj<typeof meta>

// 基础右键菜单
export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem>Forward</ContextMenuItem>
        <ContextMenuItem>Reload</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>View Source</ContextMenuItem>
        <ContextMenuItem>Inspect</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 带图标
export const WithIcons: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Copy />
          Copy
        </ContextMenuItem>
        <ContextMenuItem>
          <Scissors />
          Cut
        </ContextMenuItem>
        <ContextMenuItem>
          <ClipboardPaste />
          Paste
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Download />
          Download
        </ContextMenuItem>
        <ContextMenuItem>
          <Share />
          Share
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant='destructive'>
          <Trash />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 带快捷键
export const WithShortcuts: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Copy />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <Scissors />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <ClipboardPaste />
          Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Download />
          Save
          <ContextMenuShortcut>⌘S</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 带复选框
export const WithCheckboxes: Story = {
  render: () => {
    const [showBookmarks, setShowBookmarks] = React.useState(true)
    const [showUrls, setShowUrls] = React.useState(false)
    const [showToolbar, setShowToolbar] = React.useState(true)

    return (
      <ContextMenu>
        <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent className='w-56'>
          <ContextMenuLabel>View Options</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={showBookmarks}
            onCheckedChange={setShowBookmarks}
          >
            Show Bookmarks Bar
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            checked={showUrls}
            onCheckedChange={setShowUrls}
          >
            Show Full URLs
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            checked={showToolbar}
            onCheckedChange={setShowToolbar}
          >
            Show Toolbar
          </ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
}

// 带单选框
export const WithRadioGroup: Story = {
  render: () => {
    const [theme, setTheme] = React.useState('light')

    return (
      <ContextMenu>
        <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent className='w-56'>
          <ContextMenuLabel>Theme</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuRadioGroup value={theme} onValueChange={setTheme}>
            <ContextMenuRadioItem value='light'>Light</ContextMenuRadioItem>
            <ContextMenuRadioItem value='dark'>Dark</ContextMenuRadioItem>
            <ContextMenuRadioItem value='system'>System</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
}

// 带子菜单
export const WithSubmenu: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Edit />
          Edit
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Share />
            Share
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Email</ContextMenuItem>
            <ContextMenuItem>Social Media</ContextMenuItem>
            <ContextMenuItem>Copy Link</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Folder />
            Move to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Documents</ContextMenuItem>
            <ContextMenuItem>Downloads</ContextMenuItem>
            <ContextMenuItem>Pictures</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant='destructive'>
          <Trash />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 文件操作
export const FileOperations: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className='flex h-[150px] w-[250px] items-center justify-center rounded-md border bg-card text-card-foreground p-6'>
          <div className='text-center space-y-2'>
            <File className='h-8 w-8 mx-auto' />
            <p className='text-sm font-medium'>Document.pdf</p>
            <p className='text-xs text-muted-foreground'>
              Right click for options
            </p>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Edit />
          Open
        </ContextMenuItem>
        <ContextMenuItem>
          <Edit />
          Open With...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Copy />
          Copy
        </ContextMenuItem>
        <ContextMenuItem>
          <Scissors />
          Cut
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Star />
          Add to Favorites
        </ContextMenuItem>
        <ContextMenuItem>
          <Download />
          Download
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Share />
            Share
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Email</ContextMenuItem>
            <ContextMenuItem>Copy Link</ContextMenuItem>
            <ContextMenuItem>Share to Team</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Edit />
          Rename
        </ContextMenuItem>
        <ContextMenuItem variant='destructive'>
          <Trash />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 图片操作
export const ImageOperations: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className='relative w-[300px] h-[200px] rounded-md overflow-hidden'>
          <Image
            src='https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=300&fit=crop'
            alt='Context menu example'
            className='object-cover'
            fill
          />
          <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
            <p className='text-white text-sm font-medium'>
              Right click on image
            </p>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Edit />
          View Full Size
        </ContextMenuItem>
        <ContextMenuItem>
          <Download />
          Save Image As...
        </ContextMenuItem>
        <ContextMenuItem>
          <Copy />
          Copy Image
        </ContextMenuItem>
        <ContextMenuItem>
          <Copy />
          Copy Image URL
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Edit />
          Edit in Designer
        </ContextMenuItem>
        <ContextMenuItem>
          <Share />
          Share Image
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Set as Background</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 文本编辑器
export const TextEditor: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className='w-[400px] h-[250px] rounded-md border p-4'>
          <p className='text-sm text-muted-foreground'>
            Right click anywhere in this text area to see editing options. You
            can select, copy, paste, and perform other text operations.
          </p>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Copy />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <Scissors />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <ClipboardPaste />
          Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Select All</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Transform</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Uppercase</ContextMenuItem>
            <ContextMenuItem>Lowercase</ContextMenuItem>
            <ContextMenuItem>Capitalize</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

// 禁用项
export const WithDisabledItems: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[200px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem>
          <Copy />
          Copy
        </ContextMenuItem>
        <ContextMenuItem disabled>
          <Scissors />
          Cut (Disabled)
        </ContextMenuItem>
        <ContextMenuItem>
          <ClipboardPaste />
          Paste
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled>
          <Download />
          Download (Coming soon)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}
