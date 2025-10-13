import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Toggle } from '@/components/atoms/toggle'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Volume2,
  VolumeX,
} from 'lucide-react'
import React from 'react'

const meta = {
  title: 'Telos/Atoms/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A two-state button that can be either on or off. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

// 基础切换
export const Default: Story = {
  render: () => (
    <Toggle aria-label='Toggle italic'>
      <Italic className='h-4 w-4' />
    </Toggle>
  ),
}

// 带文本
export const WithText: Story = {
  render: () => (
    <Toggle aria-label='Toggle bold'>
      <Bold className='h-4 w-4 mr-2' />
      Bold
    </Toggle>
  ),
}

// 仅文本
export const TextOnly: Story = {
  render: () => <Toggle>Toggle me</Toggle>,
}

// Outline 变体
export const Outline: Story = {
  render: () => (
    <Toggle variant='outline' aria-label='Toggle italic'>
      <Italic className='h-4 w-4' />
    </Toggle>
  ),
}

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Toggle size='sm' aria-label='Small'>
        <Bold className='h-3 w-3' />
      </Toggle>
      <Toggle size='default' aria-label='Default'>
        <Bold className='h-4 w-4' />
      </Toggle>
      <Toggle size='lg' aria-label='Large'>
        <Bold className='h-5 w-5' />
      </Toggle>
    </div>
  ),
}

// 禁用状态
export const Disabled: Story = {
  render: () => (
    <Toggle disabled aria-label='Toggle disabled'>
      <Italic className='h-4 w-4' />
    </Toggle>
  ),
}

// 可控状态
export const Controlled: Story = {
  render: () => {
    const [pressed, setPressed] = React.useState(false)

    return (
      <div className='space-y-4'>
        <Toggle
          pressed={pressed}
          onPressedChange={setPressed}
          aria-label='Toggle bold'
        >
          <Bold className='h-4 w-4 mr-2' />
          Bold
        </Toggle>
        <p className='text-sm text-muted-foreground'>
          Status: {pressed ? 'Pressed' : 'Not pressed'}
        </p>
      </div>
    )
  },
}

// 文本编辑器工具栏
export const TextEditorToolbar: Story = {
  render: () => (
    <div className='flex items-center gap-1 p-1 border rounded-lg bg-background'>
      <Toggle aria-label='Toggle bold'>
        <Bold className='h-4 w-4' />
      </Toggle>
      <Toggle aria-label='Toggle italic'>
        <Italic className='h-4 w-4' />
      </Toggle>
      <Toggle aria-label='Toggle underline'>
        <Underline className='h-4 w-4' />
      </Toggle>
      <div className='w-px h-6 bg-border mx-1' />
      <Toggle aria-label='Align left'>
        <AlignLeft className='h-4 w-4' />
      </Toggle>
      <Toggle aria-label='Align center'>
        <AlignCenter className='h-4 w-4' />
      </Toggle>
      <Toggle aria-label='Align right'>
        <AlignRight className='h-4 w-4' />
      </Toggle>
    </div>
  ),
}

// Outline 工具栏
export const OutlineToolbar: Story = {
  render: () => (
    <div className='flex items-center gap-2 p-2 border rounded-lg bg-background'>
      <Toggle variant='outline' aria-label='Toggle bold'>
        <Bold className='h-4 w-4' />
      </Toggle>
      <Toggle variant='outline' aria-label='Toggle italic'>
        <Italic className='h-4 w-4' />
      </Toggle>
      <Toggle variant='outline' aria-label='Toggle underline'>
        <Underline className='h-4 w-4' />
      </Toggle>
    </div>
  ),
}

// 音量控制
export const VolumeControl: Story = {
  render: () => {
    const [muted, setMuted] = React.useState(false)

    return (
      <Toggle
        pressed={muted}
        onPressedChange={setMuted}
        variant='outline'
        aria-label='Toggle mute'
      >
        {muted ? (
          <VolumeX className='h-4 w-4' />
        ) : (
          <Volume2 className='h-4 w-4' />
        )}
      </Toggle>
    )
  },
}

// 带标签的切换
export const WithLabel: Story = {
  render: () => {
    const [enabled, setEnabled] = React.useState(false)

    return (
      <div className='flex items-center gap-2'>
        <label className='text-sm font-medium'>Notifications</label>
        <Toggle
          pressed={enabled}
          onPressedChange={setEnabled}
          variant='outline'
        >
          {enabled ? 'On' : 'Off'}
        </Toggle>
      </div>
    )
  },
}

// 多个独立切换
export const Multiple: Story = {
  render: () => {
    const [states, setStates] = React.useState({
      bold: false,
      italic: false,
      underline: false,
    })

    return (
      <div className='space-y-4'>
        <div className='flex gap-2'>
          <Toggle
            pressed={states.bold}
            onPressedChange={pressed => setStates({ ...states, bold: pressed })}
            variant='outline'
          >
            <Bold className='h-4 w-4 mr-2' />
            Bold
          </Toggle>
          <Toggle
            pressed={states.italic}
            onPressedChange={pressed =>
              setStates({ ...states, italic: pressed })
            }
            variant='outline'
          >
            <Italic className='h-4 w-4 mr-2' />
            Italic
          </Toggle>
          <Toggle
            pressed={states.underline}
            onPressedChange={pressed =>
              setStates({ ...states, underline: pressed })
            }
            variant='outline'
          >
            <Underline className='h-4 w-4 mr-2' />
            Underline
          </Toggle>
        </div>
        <div className='text-sm text-muted-foreground'>
          Active:{' '}
          {Object.entries(states)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(', ') || 'None'}
        </div>
      </div>
    )
  },
}

// 设置开关
export const SettingsToggles: Story = {
  render: () => {
    const [settings, setSettings] = React.useState({
      wifi: true,
      bluetooth: false,
      airplane: false,
      location: true,
    })

    return (
      <div className='w-64 space-y-3 p-4 border rounded-lg'>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Wi-Fi</span>
          <Toggle
            pressed={settings.wifi}
            onPressedChange={pressed =>
              setSettings({ ...settings, wifi: pressed })
            }
            variant='outline'
            size='sm'
          >
            {settings.wifi ? 'On' : 'Off'}
          </Toggle>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Bluetooth</span>
          <Toggle
            pressed={settings.bluetooth}
            onPressedChange={pressed =>
              setSettings({ ...settings, bluetooth: pressed })
            }
            variant='outline'
            size='sm'
          >
            {settings.bluetooth ? 'On' : 'Off'}
          </Toggle>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Airplane Mode</span>
          <Toggle
            pressed={settings.airplane}
            onPressedChange={pressed =>
              setSettings({ ...settings, airplane: pressed })
            }
            variant='outline'
            size='sm'
          >
            {settings.airplane ? 'On' : 'Off'}
          </Toggle>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Location</span>
          <Toggle
            pressed={settings.location}
            onPressedChange={pressed =>
              setSettings({ ...settings, location: pressed })
            }
            variant='outline'
            size='sm'
          >
            {settings.location ? 'On' : 'Off'}
          </Toggle>
        </div>
      </div>
    )
  },
}
