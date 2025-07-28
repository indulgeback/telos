'use client'

import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@/components/atoms'
import {
  Plus,
  Play,
  Pause,
  Settings,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { CustomLink } from '@/components/molecules'
import { redirect } from 'next/navigation'

export default function WorkflowsPage() {
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

  // 模拟工作流数据
  const workflows = [
    {
      id: '1',
      name: '数据同步工作流',
      description: '自动同步数据库数据到外部系统',
      status: 'active',
      lastRun: '2 分钟前',
      success: true,
      executions: 1234,
    },
    {
      id: '2',
      name: '邮件通知工作流',
      description: '发送定期报告邮件给团队成员',
      status: 'active',
      lastRun: '15 分钟前',
      success: true,
      executions: 567,
    },
    {
      id: '3',
      name: '报表生成工作流',
      description: '生成每日业务报表并存档',
      status: 'running',
      lastRun: '1 小时前',
      success: false,
      executions: 89,
    },
    {
      id: '4',
      name: '备份工作流',
      description: '定期备份重要数据到云存储',
      status: 'paused',
      lastRun: '1 天前',
      success: true,
      executions: 45,
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge
            variant='default'
            className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          >
            运行中
          </Badge>
        )
      case 'paused':
        return <Badge variant='secondary'>已暂停</Badge>
      case 'running':
        return (
          <Badge
            variant='default'
            className='bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
          >
            执行中
          </Badge>
        )
      default:
        return <Badge variant='outline'>未知</Badge>
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className='h-4 w-4 text-green-500' />
    ) : (
      <XCircle className='h-4 w-4 text-red-500' />
    )
  }

  return (
    <div className='container mx-auto py-8 space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-bold'>工作流管理</h1>
          <p className='text-muted-foreground'>管理和监控您的自动化工作流</p>
        </div>
        <Button asChild>
          <CustomLink href='/workflows/new'>
            <Plus className='mr-2 h-4 w-4' />
            创建工作流
          </CustomLink>
        </Button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>总工作流</p>
                <p className='text-2xl font-bold'>{workflows.length}</p>
              </div>
              <Settings className='h-8 w-8 text-muted-foreground' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>运行中</p>
                <p className='text-2xl font-bold text-green-600'>
                  {workflows.filter(w => w.status === 'active').length}
                </p>
              </div>
              <Play className='h-8 w-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>已暂停</p>
                <p className='text-2xl font-bold text-orange-600'>
                  {workflows.filter(w => w.status === 'paused').length}
                </p>
              </div>
              <Pause className='h-8 w-8 text-orange-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>总执行次数</p>
                <p className='text-2xl font-bold'>
                  {workflows.reduce((sum, w) => sum + w.executions, 0)}
                </p>
              </div>
              <Clock className='h-8 w-8 text-muted-foreground' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>工作流列表</h2>
        <div className='grid gap-4'>
          {workflows.map(workflow => (
            <Card
              key={workflow.id}
              className='hover:shadow-md transition-shadow'
            >
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1 space-y-2'>
                    <div className='flex items-center gap-3'>
                      <h3 className='text-lg font-semibold'>{workflow.name}</h3>
                      {getStatusBadge(workflow.status)}
                    </div>
                    <p className='text-muted-foreground'>
                      {workflow.description}
                    </p>
                    <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                      <div className='flex items-center gap-1'>
                        {getStatusIcon(workflow.success)}
                        <span>最后运行: {workflow.lastRun}</span>
                      </div>
                      <span>执行次数: {workflow.executions}</span>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Button variant='outline' size='sm'>
                      <Play className='h-4 w-4' />
                    </Button>
                    <Button variant='outline' size='sm'>
                      <Settings className='h-4 w-4' />
                    </Button>
                    <Button variant='outline' size='sm'>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State (if no workflows) */}
      {workflows.length === 0 && (
        <Card className='text-center py-12'>
          <CardContent>
            <div className='space-y-4'>
              <div className='mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center'>
                <Settings className='h-8 w-8 text-muted-foreground' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-lg font-semibold'>还没有工作流</h3>
                <p className='text-muted-foreground'>
                  创建您的第一个工作流来开始自动化您的业务流程
                </p>
              </div>
              <Button asChild>
                <CustomLink href='/workflows/new'>
                  <Plus className='mr-2 h-4 w-4' />
                  创建工作流
                </CustomLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
