import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Switch } from '@/components/atoms/switch'
import { Label } from '@/components/atoms/label'
import { useState } from 'react'

const meta = {
  title: 'Telos/Atoms/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A toggle switch component for binary on/off states. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    checked: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

// 基础开关
export const Default: Story = {
  args: {
    checked: false,
  },
}

export const Checked: Story = {
  args: {
    checked: true,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
}

// 带标签的开关
export const WithLabel: Story = {
  render: () => (
    <div className='flex items-center space-x-2'>
      <Switch id='airplane-mode' />
      <Label htmlFor='airplane-mode'>Airplane Mode</Label>
    </div>
  ),
}

// 可控制的开关
export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className='flex items-center space-x-2'>
        <Switch
          id='controlled'
          checked={checked}
          onCheckedChange={setChecked}
        />
        <Label htmlFor='controlled'>{checked ? 'Enabled' : 'Disabled'}</Label>
      </div>
    )
  },
}

// 表单示例
export const FormExample: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      notifications: true,
      darkMode: false,
      autoSave: true,
      analytics: false,
    })

    return (
      <div className='space-y-4 w-80'>
        <h3 className='text-lg font-semibold'>Settings</h3>

        <div className='flex items-center justify-between'>
          <Label htmlFor='notifications' className='cursor-pointer'>
            Notifications
          </Label>
          <Switch
            id='notifications'
            checked={settings.notifications}
            onCheckedChange={checked =>
              setSettings({ ...settings, notifications: checked })
            }
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label htmlFor='dark-mode' className='cursor-pointer'>
            Dark Mode
          </Label>
          <Switch
            id='dark-mode'
            checked={settings.darkMode}
            onCheckedChange={checked =>
              setSettings({ ...settings, darkMode: checked })
            }
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label htmlFor='auto-save' className='cursor-pointer'>
            Auto Save
          </Label>
          <Switch
            id='auto-save'
            checked={settings.autoSave}
            onCheckedChange={checked =>
              setSettings({ ...settings, autoSave: checked })
            }
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label htmlFor='analytics' className='cursor-pointer'>
            Analytics
          </Label>
          <Switch
            id='analytics'
            checked={settings.analytics}
            onCheckedChange={checked =>
              setSettings({ ...settings, analytics: checked })
            }
          />
        </div>
      </div>
    )
  },
}

// 带描述的开关
export const WithDescription: Story = {
  render: () => (
    <div className='flex items-start space-x-3 w-80'>
      <Switch id='marketing' className='mt-1' />
      <div className='grid gap-1.5'>
        <Label htmlFor='marketing' className='cursor-pointer'>
          Marketing emails
        </Label>
        <p className='text-sm text-muted-foreground'>
          Receive emails about new products, features, and more.
        </p>
      </div>
    </div>
  ),
}

// 多个带描述的开关
export const SettingsList: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      marketing: false,
      social: true,
      security: true,
    })

    return (
      <div className='space-y-6 w-96'>
        <div>
          <h3 className='text-lg font-semibold mb-4'>Email Preferences</h3>
          <div className='space-y-4'>
            <div className='flex items-start space-x-3'>
              <Switch
                id='marketing-emails'
                checked={settings.marketing}
                onCheckedChange={checked =>
                  setSettings({ ...settings, marketing: checked })
                }
                className='mt-1'
              />
              <div className='grid gap-1.5'>
                <Label htmlFor='marketing-emails' className='cursor-pointer'>
                  Marketing emails
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Receive emails about new products, features, and more.
                </p>
              </div>
            </div>

            <div className='flex items-start space-x-3'>
              <Switch
                id='social-emails'
                checked={settings.social}
                onCheckedChange={checked =>
                  setSettings({ ...settings, social: checked })
                }
                className='mt-1'
              />
              <div className='grid gap-1.5'>
                <Label htmlFor='social-emails' className='cursor-pointer'>
                  Social emails
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Receive emails for friend requests, follows, and more.
                </p>
              </div>
            </div>

            <div className='flex items-start space-x-3'>
              <Switch
                id='security-emails'
                checked={settings.security}
                onCheckedChange={checked =>
                  setSettings({ ...settings, security: checked })
                }
                className='mt-1'
              />
              <div className='grid gap-1.5'>
                <Label htmlFor='security-emails' className='cursor-pointer'>
                  Security emails
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Receive emails about your account security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
}
