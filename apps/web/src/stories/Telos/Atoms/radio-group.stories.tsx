import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group'
import { Label } from '@/components/atoms/label'
import { useState } from 'react'

const meta = {
  title: 'Telos/Atoms/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time. Built with Radix UI primitives.',
      },
    },
  },
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

// 基础单选框组
export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue='option-one'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-one' id='option-one' />
        <Label htmlFor='option-one'>Option One</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-two' id='option-two' />
        <Label htmlFor='option-two'>Option Two</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-three' id='option-three' />
        <Label htmlFor='option-three'>Option Three</Label>
      </div>
    </RadioGroup>
  ),
}

// 禁用状态
export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue='option-one'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-one' id='d-option-one' />
        <Label htmlFor='d-option-one'>Option One</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-two' id='d-option-two' disabled />
        <Label htmlFor='d-option-two' className='opacity-50'>
          Option Two (Disabled)
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-three' id='d-option-three' />
        <Label htmlFor='d-option-three'>Option Three</Label>
      </div>
    </RadioGroup>
  ),
}

// 可控制的单选框组
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('comfortable')

    return (
      <div className='space-y-3'>
        <RadioGroup value={value} onValueChange={setValue}>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='default' id='c-default' />
            <Label htmlFor='c-default'>Default</Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='comfortable' id='c-comfortable' />
            <Label htmlFor='c-comfortable'>Comfortable</Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='compact' id='c-compact' />
            <Label htmlFor='c-compact'>Compact</Label>
          </div>
        </RadioGroup>
        <p className='text-sm text-muted-foreground'>
          Selected: <span className='font-medium'>{value}</span>
        </p>
      </div>
    )
  },
}

// 带描述的单选框组
export const WithDescription: Story = {
  render: () => (
    <RadioGroup defaultValue='card' className='gap-4'>
      <div className='flex items-start space-x-3'>
        <RadioGroupItem value='card' id='payment-card' className='mt-1' />
        <div className='grid gap-1.5'>
          <Label htmlFor='payment-card' className='cursor-pointer'>
            Credit Card
          </Label>
          <p className='text-sm text-muted-foreground'>
            Pay with credit or debit card
          </p>
        </div>
      </div>
      <div className='flex items-start space-x-3'>
        <RadioGroupItem value='paypal' id='payment-paypal' className='mt-1' />
        <div className='grid gap-1.5'>
          <Label htmlFor='payment-paypal' className='cursor-pointer'>
            PayPal
          </Label>
          <p className='text-sm text-muted-foreground'>
            Pay with your PayPal account
          </p>
        </div>
      </div>
      <div className='flex items-start space-x-3'>
        <RadioGroupItem value='apple' id='payment-apple' className='mt-1' />
        <div className='grid gap-1.5'>
          <Label htmlFor='payment-apple' className='cursor-pointer'>
            Apple Pay
          </Label>
          <p className='text-sm text-muted-foreground'>Pay with Apple Pay</p>
        </div>
      </div>
    </RadioGroup>
  ),
}

// 表单示例
export const FormExample: Story = {
  render: () => {
    const [notification, setNotification] = useState('all')

    return (
      <div className='space-y-4 w-96'>
        <div>
          <h3 className='text-lg font-semibold mb-2'>Notification Settings</h3>
          <p className='text-sm text-muted-foreground mb-4'>
            Choose how you want to be notified about updates.
          </p>
        </div>

        <RadioGroup value={notification} onValueChange={setNotification}>
          <div className='flex items-start space-x-3'>
            <RadioGroupItem value='all' id='notify-all' className='mt-1' />
            <div className='grid gap-1.5'>
              <Label htmlFor='notify-all' className='cursor-pointer'>
                All new messages
              </Label>
              <p className='text-sm text-muted-foreground'>
                Get notified for all new messages and updates.
              </p>
            </div>
          </div>

          <div className='flex items-start space-x-3'>
            <RadioGroupItem
              value='mentions'
              id='notify-mentions'
              className='mt-1'
            />
            <div className='grid gap-1.5'>
              <Label htmlFor='notify-mentions' className='cursor-pointer'>
                Direct messages and mentions
              </Label>
              <p className='text-sm text-muted-foreground'>
                Only get notified when someone mentions you or sends a direct
                message.
              </p>
            </div>
          </div>

          <div className='flex items-start space-x-3'>
            <RadioGroupItem value='none' id='notify-none' className='mt-1' />
            <div className='grid gap-1.5'>
              <Label htmlFor='notify-none' className='cursor-pointer'>
                Nothing
              </Label>
              <p className='text-sm text-muted-foreground'>
                Don't get notified for any messages or updates.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>
    )
  },
}

// 水平布局
export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue='comfortable' className='flex space-x-4'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='default' id='h-default' />
        <Label htmlFor='h-default'>Default</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='comfortable' id='h-comfortable' />
        <Label htmlFor='h-comfortable'>Comfortable</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='compact' id='h-compact' />
        <Label htmlFor='h-compact'>Compact</Label>
      </div>
    </RadioGroup>
  ),
}

// 卡片样式
export const CardStyle: Story = {
  render: () => {
    const [plan, setPlan] = useState('pro')

    return (
      <RadioGroup value={plan} onValueChange={setPlan} className='gap-4 w-96'>
        <div
          className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 transition-colors ${
            plan === 'free'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background'
          }`}
        >
          <RadioGroupItem value='free' id='plan-free' className='mt-1' />
          <div className='flex-1 grid gap-1.5'>
            <div className='flex items-center justify-between'>
              <Label
                htmlFor='plan-free'
                className='cursor-pointer font-semibold'
              >
                Free
              </Label>
              <span className='text-sm font-semibold'>$0/month</span>
            </div>
            <p className='text-sm text-muted-foreground'>
              Perfect for personal projects and testing.
            </p>
            <ul className='text-sm text-muted-foreground mt-2 space-y-1'>
              <li>• Up to 5 projects</li>
              <li>• 1GB storage</li>
              <li>• Community support</li>
            </ul>
          </div>
        </div>

        <div
          className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 transition-colors ${
            plan === 'pro'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background'
          }`}
        >
          <RadioGroupItem value='pro' id='plan-pro' className='mt-1' />
          <div className='flex-1 grid gap-1.5'>
            <div className='flex items-center justify-between'>
              <Label
                htmlFor='plan-pro'
                className='cursor-pointer font-semibold'
              >
                Pro
              </Label>
              <span className='text-sm font-semibold'>$12/month</span>
            </div>
            <p className='text-sm text-muted-foreground'>
              For professionals and small teams.
            </p>
            <ul className='text-sm text-muted-foreground mt-2 space-y-1'>
              <li>• Unlimited projects</li>
              <li>• 100GB storage</li>
              <li>• Priority support</li>
              <li>• Advanced analytics</li>
            </ul>
          </div>
        </div>

        <div
          className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 transition-colors ${
            plan === 'enterprise'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background'
          }`}
        >
          <RadioGroupItem
            value='enterprise'
            id='plan-enterprise'
            className='mt-1'
          />
          <div className='flex-1 grid gap-1.5'>
            <div className='flex items-center justify-between'>
              <Label
                htmlFor='plan-enterprise'
                className='cursor-pointer font-semibold'
              >
                Enterprise
              </Label>
              <span className='text-sm font-semibold'>Custom</span>
            </div>
            <p className='text-sm text-muted-foreground'>
              For large organizations with custom needs.
            </p>
            <ul className='text-sm text-muted-foreground mt-2 space-y-1'>
              <li>• Unlimited everything</li>
              <li>• Dedicated support</li>
              <li>• Custom integrations</li>
              <li>• SLA guarantee</li>
            </ul>
          </div>
        </div>
      </RadioGroup>
    )
  },
}
