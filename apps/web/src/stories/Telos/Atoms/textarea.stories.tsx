import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Textarea } from '@/components/atoms/textarea'
import { Label } from '@/components/atoms/label'
import { useState } from 'react'

const meta = {
  title: 'Telos/Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A multi-line text input component for longer form content. Features auto-resizing, placeholder text, and validation states.',
      },
    },
  },
  argTypes: {
    placeholder: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    rows: {
      control: 'number',
    },
  },
  args: {
    placeholder: 'Type your message here.',
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

// 基础文本域
export const Default: Story = {
  args: {},
}

// 禁用状态
export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'This textarea is disabled',
  },
}

// 带标签
export const WithLabel: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='message'>Your message</Label>
      <Textarea id='message' placeholder='Type your message here.' />
    </div>
  ),
}

// 带标签和帮助文本
export const WithLabelAndHelperText: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='bio'>Bio</Label>
      <Textarea id='bio' placeholder='Tell us about yourself' />
      <p className='text-sm text-muted-foreground'>
        Your bio will be displayed on your public profile.
      </p>
    </div>
  ),
}

// 字符计数
export const WithCharacterCount: Story = {
  render: () => {
    const [value, setValue] = useState('')
    const maxLength = 280

    return (
      <div className='grid w-full max-w-sm items-center gap-1.5'>
        <div className='flex justify-between'>
          <Label htmlFor='tweet'>Tweet</Label>
          <span className='text-sm text-muted-foreground'>
            {value.length}/{maxLength}
          </span>
        </div>
        <Textarea
          id='tweet'
          placeholder="What's happening?"
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={maxLength}
        />
      </div>
    )
  },
}

// 自动调整大小
export const AutoResize: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='auto-resize'>Auto-resizing Textarea</Label>
      <Textarea id='auto-resize' placeholder='Type here and watch it grow...' />
      <p className='text-sm text-muted-foreground'>
        This textarea automatically adjusts its height based on content.
      </p>
    </div>
  ),
}

// 表单示例
export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      subject: '',
      message: '',
    })

    return (
      <div className='space-y-4 w-96'>
        <div className='grid gap-1.5'>
          <Label htmlFor='subject'>Subject</Label>
          <input
            id='subject'
            type='text'
            placeholder='Enter subject'
            value={formData.subject}
            onChange={e =>
              setFormData({ ...formData, subject: e.target.value })
            }
            className='border-input placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-65 md:text-sm'
          />
        </div>

        <div className='grid gap-1.5'>
          <Label htmlFor='message-form'>Message</Label>
          <Textarea
            id='message-form'
            placeholder='Type your message here.'
            value={formData.message}
            onChange={e =>
              setFormData({ ...formData, message: e.target.value })
            }
            rows={5}
          />
        </div>

        <button
          type='button'
          className='inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
        >
          Send Message
        </button>
      </div>
    )
  },
}

// 验证状态
export const WithError: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='error-textarea'>Description</Label>
      <Textarea
        id='error-textarea'
        placeholder='Enter description'
        aria-invalid='true'
      />
      <p className='text-sm text-destructive'>
        Description must be at least 10 characters.
      </p>
    </div>
  ),
}

export const WithSuccess: Story = {
  render: () => (
    <div className='grid w-full max-w-sm items-center gap-1.5'>
      <Label htmlFor='success-textarea'>Description</Label>
      <Textarea
        id='success-textarea'
        placeholder='Enter description'
        className='border-green-500 focus-visible:ring-green-500'
        defaultValue='This is a valid description with enough characters.'
      />
      <p className='text-sm text-green-600'>Looks good!</p>
    </div>
  ),
}

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className='space-y-4 w-96'>
      <div className='grid gap-1.5'>
        <Label>Small (3 rows)</Label>
        <Textarea placeholder='Small textarea' rows={3} />
      </div>
      <div className='grid gap-1.5'>
        <Label>Medium (5 rows)</Label>
        <Textarea placeholder='Medium textarea' rows={5} />
      </div>
      <div className='grid gap-1.5'>
        <Label>Large (8 rows)</Label>
        <Textarea placeholder='Large textarea' rows={8} />
      </div>
    </div>
  ),
}

// 评论框示例
export const CommentBox: Story = {
  render: () => {
    const [comment, setComment] = useState('')

    return (
      <div className='w-96 rounded-lg border p-4'>
        <div className='space-y-3'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
              JD
            </div>
            <div className='flex-1 space-y-2'>
              <Textarea
                placeholder='Write a comment...'
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
              />
              <div className='flex justify-between items-center'>
                <span className='text-xs text-muted-foreground'>
                  {comment.length} characters
                </span>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    className='inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground'
                    onClick={() => setComment('')}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    className='inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                    disabled={!comment.trim()}
                  >
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
}

// 富文本编辑器样式
export const RichTextStyle: Story = {
  render: () => (
    <div className='w-[600px]'>
      <div className='rounded-lg border'>
        <div className='border-b px-3 py-2'>
          <div className='flex gap-1'>
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent'
              title='Bold'
            >
              <strong>B</strong>
            </button>
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent'
              title='Italic'
            >
              <em>I</em>
            </button>
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent'
              title='Underline'
            >
              <u>U</u>
            </button>
            <div className='mx-2 w-px bg-border' />
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent'
              title='Link'
            >
              🔗
            </button>
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent'
              title='Image'
            >
              🖼️
            </button>
          </div>
        </div>
        <div className='p-3'>
          <Textarea
            placeholder='Start writing...'
            rows={10}
            className='border-0 shadow-none focus-visible:ring-0'
          />
        </div>
      </div>
    </div>
  ),
}
