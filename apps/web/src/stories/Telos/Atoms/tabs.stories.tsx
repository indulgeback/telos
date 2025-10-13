import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/atoms/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/atoms/card'
import { Label } from '@/components/atoms/label'
import { Input } from '@/components/atoms/input'
import { Button } from '@/components/atoms/button'
import { User, Settings, Bell, Shield } from 'lucide-react'

const meta = {
  title: 'Telos/Atoms/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A set of layered sections of content—known as tab panels—that are displayed one at a time. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

// 基础标签页
export const Default: Story = {
  render: () => (
    <Tabs defaultValue='account' className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>
        <p className='text-sm text-muted-foreground'>
          Make changes to your account here. Click save when you're done.
        </p>
      </TabsContent>
      <TabsContent value='password'>
        <p className='text-sm text-muted-foreground'>
          Change your password here. After saving, you'll be logged out.
        </p>
      </TabsContent>
    </Tabs>
  ),
}

// 三个标签页
export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue='overview' className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='overview'>Overview</TabsTrigger>
        <TabsTrigger value='analytics'>Analytics</TabsTrigger>
        <TabsTrigger value='reports'>Reports</TabsTrigger>
      </TabsList>
      <TabsContent value='overview'>
        <p className='text-sm text-muted-foreground'>
          Overview content goes here.
        </p>
      </TabsContent>
      <TabsContent value='analytics'>
        <p className='text-sm text-muted-foreground'>
          Analytics content goes here.
        </p>
      </TabsContent>
      <TabsContent value='reports'>
        <p className='text-sm text-muted-foreground'>
          Reports content goes here.
        </p>
      </TabsContent>
    </Tabs>
  ),
}

// 带图标的标签页
export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue='profile' className='w-[500px]'>
      <TabsList>
        <TabsTrigger value='profile'>
          <User className='mr-2 h-4 w-4' />
          Profile
        </TabsTrigger>
        <TabsTrigger value='settings'>
          <Settings className='mr-2 h-4 w-4' />
          Settings
        </TabsTrigger>
        <TabsTrigger value='notifications'>
          <Bell className='mr-2 h-4 w-4' />
          Notifications
        </TabsTrigger>
      </TabsList>
      <TabsContent value='profile'>
        <p className='text-sm text-muted-foreground'>Profile settings</p>
      </TabsContent>
      <TabsContent value='settings'>
        <p className='text-sm text-muted-foreground'>General settings</p>
      </TabsContent>
      <TabsContent value='notifications'>
        <p className='text-sm text-muted-foreground'>
          Notification preferences
        </p>
      </TabsContent>
    </Tabs>
  ),
}

// 禁用标签页
export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue='available' className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='available'>Available</TabsTrigger>
        <TabsTrigger value='disabled' disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value='also-available'>Also Available</TabsTrigger>
      </TabsList>
      <TabsContent value='available'>
        <p className='text-sm text-muted-foreground'>This tab is available.</p>
      </TabsContent>
      <TabsContent value='disabled'>
        <p className='text-sm text-muted-foreground'>
          You should not see this.
        </p>
      </TabsContent>
      <TabsContent value='also-available'>
        <p className='text-sm text-muted-foreground'>
          This tab is also available.
        </p>
      </TabsContent>
    </Tabs>
  ),
}

// 带卡片的标签页
export const WithCards: Story = {
  render: () => (
    <Tabs defaultValue='account' className='w-[500px]'>
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger value='account'>Account</TabsTrigger>
        <TabsTrigger value='password'>Password</TabsTrigger>
      </TabsList>
      <TabsContent value='account'>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='space-y-1'>
              <Label htmlFor='name'>Name</Label>
              <Input id='name' defaultValue='Pedro Duarte' />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='username'>Username</Label>
              <Input id='username' defaultValue='@peduarte' />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value='password'>
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='space-y-1'>
              <Label htmlFor='current'>Current password</Label>
              <Input id='current' type='password' />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='new'>New password</Label>
              <Input id='new' type='password' />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

// 全宽标签页
export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue='tab1' className='w-[600px]'>
      <TabsList className='grid w-full grid-cols-4'>
        <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        <TabsTrigger value='tab2'>Tab 2</TabsTrigger>
        <TabsTrigger value='tab3'>Tab 3</TabsTrigger>
        <TabsTrigger value='tab4'>Tab 4</TabsTrigger>
      </TabsList>
      <TabsContent value='tab1'>
        <div className='rounded-lg border p-6'>
          <h3 className='text-lg font-semibold mb-2'>Tab 1 Content</h3>
          <p className='text-sm text-muted-foreground'>
            This is the content for tab 1.
          </p>
        </div>
      </TabsContent>
      <TabsContent value='tab2'>
        <div className='rounded-lg border p-6'>
          <h3 className='text-lg font-semibold mb-2'>Tab 2 Content</h3>
          <p className='text-sm text-muted-foreground'>
            This is the content for tab 2.
          </p>
        </div>
      </TabsContent>
      <TabsContent value='tab3'>
        <div className='rounded-lg border p-6'>
          <h3 className='text-lg font-semibold mb-2'>Tab 3 Content</h3>
          <p className='text-sm text-muted-foreground'>
            This is the content for tab 3.
          </p>
        </div>
      </TabsContent>
      <TabsContent value='tab4'>
        <div className='rounded-lg border p-6'>
          <h3 className='text-lg font-semibold mb-2'>Tab 4 Content</h3>
          <p className='text-sm text-muted-foreground'>
            This is the content for tab 4.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
}

// 设置页面示例
export const SettingsPage: Story = {
  render: () => (
    <Tabs defaultValue='general' className='w-[700px]'>
      <TabsList>
        <TabsTrigger value='general'>
          <Settings className='mr-2 h-4 w-4' />
          General
        </TabsTrigger>
        <TabsTrigger value='security'>
          <Shield className='mr-2 h-4 w-4' />
          Security
        </TabsTrigger>
        <TabsTrigger value='notifications'>
          <Bell className='mr-2 h-4 w-4' />
          Notifications
        </TabsTrigger>
      </TabsList>

      <TabsContent value='general' className='space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your profile information and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='display-name'>Display Name</Label>
              <Input id='display-name' placeholder='Enter your name' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input id='email' type='email' placeholder='your@email.com' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='bio'>Bio</Label>
              <textarea
                id='bio'
                placeholder='Tell us about yourself'
                className='border-input placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]'
                rows={3}
              />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='security' className='space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Manage your password and security preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='current-password'>Current Password</Label>
              <Input id='current-password' type='password' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='new-password'>New Password</Label>
              <Input id='new-password' type='password' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirm-password'>Confirm Password</Label>
              <Input id='confirm-password' type='password' />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='notifications' className='space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose how you want to be notified.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label>Email Notifications</Label>
                <p className='text-sm text-muted-foreground'>
                  Receive email updates about your account.
                </p>
              </div>
            </div>
            <div className='flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label>Push Notifications</Label>
                <p className='text-sm text-muted-foreground'>
                  Receive push notifications on your devices.
                </p>
              </div>
            </div>
            <Button>Save Preferences</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

// 垂直布局（自定义样式）
export const VerticalLayout: Story = {
  render: () => (
    <Tabs defaultValue='home' className='flex w-[600px]' orientation='vertical'>
      <TabsList className='flex-col h-auto'>
        <TabsTrigger value='home' className='w-full justify-start'>
          Home
        </TabsTrigger>
        <TabsTrigger value='profile' className='w-full justify-start'>
          Profile
        </TabsTrigger>
        <TabsTrigger value='settings' className='w-full justify-start'>
          Settings
        </TabsTrigger>
        <TabsTrigger value='help' className='w-full justify-start'>
          Help
        </TabsTrigger>
      </TabsList>
      <div className='flex-1 ml-4'>
        <TabsContent value='home'>
          <div className='rounded-lg border p-6'>
            <h3 className='text-lg font-semibold mb-2'>Home</h3>
            <p className='text-sm text-muted-foreground'>
              Welcome to your dashboard.
            </p>
          </div>
        </TabsContent>
        <TabsContent value='profile'>
          <div className='rounded-lg border p-6'>
            <h3 className='text-lg font-semibold mb-2'>Profile</h3>
            <p className='text-sm text-muted-foreground'>
              View and edit your profile information.
            </p>
          </div>
        </TabsContent>
        <TabsContent value='settings'>
          <div className='rounded-lg border p-6'>
            <h3 className='text-lg font-semibold mb-2'>Settings</h3>
            <p className='text-sm text-muted-foreground'>
              Manage your account settings.
            </p>
          </div>
        </TabsContent>
        <TabsContent value='help'>
          <div className='rounded-lg border p-6'>
            <h3 className='text-lg font-semibold mb-2'>Help</h3>
            <p className='text-sm text-muted-foreground'>
              Get help and support.
            </p>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  ),
}
