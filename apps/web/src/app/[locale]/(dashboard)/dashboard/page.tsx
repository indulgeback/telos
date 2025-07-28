'use client'

import { useSession } from 'next-auth/react'
import { CustomLink } from '@/components/molecules'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/atoms'
import {
  Activity,
  Users,
  Workflow,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className='container mx-auto py-8'>
        <div className='space-y-6'>
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
    <div className='container mx-auto py-8 space-y-8'>
      {/* Welcome Section */}
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-bold'>
            欢迎回来，{user.name?.split(' ')[0] || '用户'}！
          </h1>
          <p className='text-muted-foreground'>这是您的工作流管理仪表板</p>
        </div>
        <div className='flex items-center gap-4'>
          <Avatar className='h-10 w-10'>
            <AvatarImage src={user.image || ''} alt={user.name || ''} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>活跃工作流</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>12</div>
            <p className='text-xs text-muted-foreground'>+2 较上周</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>总执行次数</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>1,234</div>
            <p className='text-xs text-muted-foreground'>+15% 较上月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>成功率</CardTitle>
            <Workflow className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>98.5%</div>
            <p className='text-xs text-muted-foreground'>+0.5% 较上周</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>平均执行时间</CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>2.3s</div>
            <p className='text-xs text-muted-foreground'>-0.2s 较上周</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='grid md:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用的工作流管理操作</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button asChild className='w-full justify-start'>
              <CustomLink href='/workflows/new'>
                <Plus className='mr-2 h-4 w-4' />
                创建新工作流
              </CustomLink>
            </Button>
            <Button asChild variant='outline' className='w-full justify-start'>
              <CustomLink href='/workflows'>
                <Workflow className='mr-2 h-4 w-4' />
                查看所有工作流
              </CustomLink>
            </Button>
            <Button asChild variant='outline' className='w-full justify-start'>
              <CustomLink href='/settings'>
                <Users className='mr-2 h-4 w-4' />
                管理设置
              </CustomLink>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
            <CardDescription>您最近的工作流执行记录</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>数据同步工作流</p>
                  <p className='text-xs text-muted-foreground'>
                    2 分钟前执行成功
                  </p>
                </div>
                <div className='h-2 w-2 bg-green-500 rounded-full'></div>
              </div>

              <div className='flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>邮件通知工作流</p>
                  <p className='text-xs text-muted-foreground'>
                    15 分钟前执行成功
                  </p>
                </div>
                <div className='h-2 w-2 bg-blue-500 rounded-full'></div>
              </div>

              <div className='flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>报表生成工作流</p>
                  <p className='text-xs text-muted-foreground'>
                    1 小时前执行中
                  </p>
                </div>
                <div className='h-2 w-2 bg-orange-500 rounded-full animate-pulse'></div>
              </div>
            </div>

            <Button asChild variant='ghost' className='w-full'>
              <CustomLink href='/workflows/history'>
                查看全部历史
                <ArrowRight className='ml-2 h-4 w-4' />
              </CustomLink>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>开始使用 Telos</CardTitle>
          <CardDescription>
            快速上手指南，帮助您充分利用平台功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid md:grid-cols-3 gap-4'>
            <div className='space-y-2'>
              <h4 className='font-medium'>1. 创建工作流</h4>
              <p className='text-sm text-muted-foreground'>
                使用可视化编辑器创建您的第一个自动化工作流
              </p>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium'>2. 配置触发器</h4>
              <p className='text-sm text-muted-foreground'>
                设置工作流的触发条件和执行计划
              </p>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium'>3. 监控执行</h4>
              <p className='text-sm text-muted-foreground'>
                实时监控工作流执行状态和性能指标
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
