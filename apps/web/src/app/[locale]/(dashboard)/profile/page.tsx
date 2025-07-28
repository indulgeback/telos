'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Separator,
} from '@/components/atoms'
import { User, Mail, Calendar, Github, Settings } from 'lucide-react'
import { CustomLink } from '@/components/molecules'
import { redirect } from 'next/navigation'

export default function ProfilePage() {
  const { data: session, status } = useSession()

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

  const user = session?.user
  if (!user) return null

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className='container mx-auto py-8'>
      <div className='max-w-2xl mx-auto space-y-6'>
        <div>
          <h1 className='text-3xl font-bold'>个人资料</h1>
          <p className='text-muted-foreground'>管理您的账户信息和偏好设置</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <User className='h-5 w-5' />
              基本信息
            </CardTitle>
            <CardDescription>您的基本账户信息</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='flex items-center gap-4'>
              <Avatar className='h-20 w-20'>
                <AvatarImage src={user.image || ''} alt={user.name || ''} />
                <AvatarFallback className='text-lg'>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className='space-y-1'>
                <h3 className='text-xl font-semibold'>
                  {user.name || '未知用户'}
                </h3>
                <p className='text-muted-foreground flex items-center gap-2'>
                  <Mail className='h-4 w-4' />
                  {user.email}
                </p>
                <Badge variant='secondary' className='w-fit'>
                  <Github className='h-3 w-3 mr-1' />
                  GitHub 用户
                </Badge>
              </div>
            </div>

            <Separator />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>用户名</label>
                <p className='text-sm text-muted-foreground'>
                  {user.name || '未设置'}
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>邮箱地址</label>
                <p className='text-sm text-muted-foreground'>
                  {user.email || '未设置'}
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>用户 ID</label>
                <p className='text-sm text-muted-foreground font-mono'>
                  {user.id}
                </p>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>注册时间</label>
                <p className='text-sm text-muted-foreground flex items-center gap-1'>
                  <Calendar className='h-3 w-3' />
                  通过 GitHub 登录
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='h-5 w-5' />
              账户操作
            </CardTitle>
            <CardDescription>管理您的账户设置</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col sm:flex-row gap-2'>
              <Button asChild variant='outline'>
                <CustomLink href='/settings'>
                  <Settings className='h-4 w-4 mr-2' />
                  账户设置
                </CustomLink>
              </Button>
              <Button asChild variant='outline'>
                <CustomLink href='/workflows'>查看工作流</CustomLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
