'use client'

import { authClient } from '@/lib/auth-client'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('Dashboard')
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
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

  if (!session) {
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
            {t('welcome', {
              name: user.name?.split(' ')[0] || t('welcomeFallback'),
            })}
          </h1>
          <p className='text-muted-foreground'>{t('subtitle')}</p>
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
            <CardTitle className='text-sm font-medium'>
              {t('stats.activeWorkflows')}
            </CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>12</div>
            <p className='text-xs text-muted-foreground'>
              +2 {t('stats.comparedToLastWeek')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              {t('stats.totalExecutions')}
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>1,234</div>
            <p className='text-xs text-muted-foreground'>
              +15% {t('stats.comparedToLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              {t('stats.successRate')}
            </CardTitle>
            <Workflow className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>98.5%</div>
            <p className='text-xs text-muted-foreground'>
              +0.5% {t('stats.comparedToLastWeek')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              {t('stats.avgExecutionTime')}
            </CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>2.3s</div>
            <p className='text-xs text-muted-foreground'>
              -0.2s {t('stats.comparedToLastWeek')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='grid md:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>{t('quickActions.title')}</CardTitle>
            <CardDescription>{t('quickActions.description')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button asChild className='w-full justify-start'>
              <CustomLink href='/workflows/new'>
                <Plus className='mr-2 h-4 w-4' />
                {t('quickActions.createWorkflow')}
              </CustomLink>
            </Button>
            <Button asChild variant='outline' className='w-full justify-start'>
              <CustomLink href='/workflows'>
                <Workflow className='mr-2 h-4 w-4' />
                {t('quickActions.viewWorkflows')}
              </CustomLink>
            </Button>
            <Button asChild variant='outline' className='w-full justify-start'>
              <CustomLink href='/settings'>
                <Users className='mr-2 h-4 w-4' />
                {t('quickActions.manageSettings')}
              </CustomLink>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('recentActivity.title')}</CardTitle>
            <CardDescription>{t('recentActivity.description')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>
                    {t('activityItems.dataSyncWorkflow')}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('activityItems.timeAgo.minutes', { n: 2 })}{' '}
                    {t('activityItems.executionSuccess')}
                  </p>
                </div>
                <div className='h-2 w-2 bg-green-500 rounded-full'></div>
              </div>

              <div className='flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>
                    {t('activityItems.emailNotificationWorkflow')}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('activityItems.timeAgo.minutes', { n: 15 })}{' '}
                    {t('activityItems.executionSuccess')}
                  </p>
                </div>
                <div className='h-2 w-2 bg-blue-500 rounded-full'></div>
              </div>

              <div className='flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>
                    {t('activityItems.reportGenerationWorkflow')}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('activityItems.timeAgo.hours', { n: 1 })}{' '}
                    {t('activityItems.executionRunning')}
                  </p>
                </div>
                <div className='h-2 w-2 bg-orange-500 rounded-full animate-pulse'></div>
              </div>
            </div>

            <Button asChild variant='ghost' className='w-full'>
              <CustomLink href='/workflows/history'>
                {t('recentActivity.viewAllHistory')}
                <ArrowRight className='ml-2 h-4 w-4' />
              </CustomLink>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gettingStarted.title')}</CardTitle>
          <CardDescription>{t('gettingStarted.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid md:grid-cols-3 gap-4'>
            <div className='space-y-2'>
              <h4 className='font-medium'>{t('gettingStarted.step1.title')}</h4>
              <p className='text-sm text-muted-foreground'>
                {t('gettingStarted.step1.description')}
              </p>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium'>{t('gettingStarted.step2.title')}</h4>
              <p className='text-sm text-muted-foreground'>
                {t('gettingStarted.step2.description')}
              </p>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium'>{t('gettingStarted.step3.title')}</h4>
              <p className='text-sm text-muted-foreground'>
                {t('gettingStarted.step3.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
