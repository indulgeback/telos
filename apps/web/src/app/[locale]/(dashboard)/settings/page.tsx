'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Label,
  Separator,
  Alert,
} from '@/components/atoms'
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { useState } from 'react'

export default function SettingsPage() {
  const { data: session, status } = useSession()

  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [emailUpdates, setEmailUpdates] = useState(true)

  if (status === 'loading') {
    return (
      <div className='container mx-auto py-8'>
        <div className='max-w-2xl mx-auto space-y-6'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-1/3 mb-4'></div>
            <div className='h-4 bg-gray-200 rounded w-2/3'></div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  return (
    <div className='container mx-auto py-8'>
      <div className='max-w-2xl mx-auto space-y-6'>
        <div>
          <h1 className='text-3xl font-bold'>设置</h1>
          <p className='text-muted-foreground'>管理您的账户偏好和应用设置</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Bell className='h-5 w-5' />
              通知设置
            </CardTitle>
            <CardDescription>控制您接收通知的方式</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label htmlFor='notifications'>推送通知</Label>
                <p className='text-sm text-muted-foreground'>
                  接收工作流状态更新和系统通知
                </p>
              </div>
              <Switch
                id='notifications'
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label htmlFor='email-updates'>邮件通知</Label>
                <p className='text-sm text-muted-foreground'>
                  接收重要更新和安全通知邮件
                </p>
              </div>
              <Switch
                id='email-updates'
                checked={emailUpdates}
                onCheckedChange={setEmailUpdates}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Palette className='h-5 w-5' />
              外观设置
            </CardTitle>
            <CardDescription>自定义应用的外观和主题</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label htmlFor='dark-mode'>深色模式</Label>
                <p className='text-sm text-muted-foreground'>
                  切换到深色主题以减少眼部疲劳
                </p>
              </div>
              <Switch
                id='dark-mode'
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Globe className='h-5 w-5' />
              语言和地区
            </CardTitle>
            <CardDescription>设置您的语言偏好和地区格式</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label>界面语言</Label>
              <p className='text-sm text-muted-foreground'>
                当前语言：中文（简体）
              </p>
              <Button variant='outline' size='sm'>
                更改语言
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5' />
              安全设置
            </CardTitle>
            <CardDescription>管理您的账户安全和隐私设置</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label>登录方式</Label>
              <p className='text-sm text-muted-foreground'>
                当前通过 GitHub 登录
              </p>
            </div>
            <Separator />
            <div className='space-y-2'>
              <Label>会话管理</Label>
              <p className='text-sm text-muted-foreground'>
                管理您的活跃登录会话
              </p>
              <Button variant='outline' size='sm'>
                查看活跃会话
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='border-red-200 dark:border-red-800'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
              <AlertTriangle className='h-5 w-5' />
              危险操作
            </CardTitle>
            <CardDescription>这些操作是不可逆的，请谨慎操作</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Alert variant='destructive'>
              <AlertTriangle className='h-4 w-4' />
              <p className='text-sm'>
                删除账户将永久删除您的所有数据，包括工作流、设置和个人信息。此操作无法撤销。
              </p>
            </Alert>
            <Button variant='destructive' size='sm'>
              删除账户
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
