'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
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
import { User, Mail, Calendar, Settings } from 'lucide-react'
import { CustomLink } from '@/components/molecules'
import { redirect } from 'next/navigation'
import { SystemSettingsModal } from '@/components/molecules/SystemSettingsModal'

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession()
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const t = useTranslations('Profile')

  if (isPending) {
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
    <>
      <div className='container mx-auto py-8'>
        <div className='max-w-2xl mx-auto space-y-6'>
          <div>
            <h1 className='text-3xl font-bold'>{t('title')}</h1>
            <p className='text-muted-foreground'>{t('subtitle')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='h-5 w-5' />
                {t('basicInfo')}
              </CardTitle>
              <CardDescription>{t('basicInfoDesc')}</CardDescription>
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
                    {user.name || t('unknownUser')}
                  </h3>
                  <p className='text-muted-foreground flex items-center gap-2'>
                    <Mail className='h-4 w-4' />
                    {user.email}
                  </p>
                  <Badge variant='secondary' className='w-fit'>
                    <User className='h-3 w-3 mr-1' />
                    {t('platformUser')}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('username')}</label>
                  <p className='text-sm text-muted-foreground'>
                    {user.name || t('notSet')}
                  </p>
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('email')}</label>
                  <p className='text-sm text-muted-foreground'>
                    {user.email || t('notSet')}
                  </p>
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('userId')}</label>
                  <p className='text-sm text-muted-foreground font-mono'>
                    {user.id}
                  </p>
                </div>
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>{t('regTime')}</label>
                  <p className='text-sm text-muted-foreground flex items-center gap-1'>
                    <Calendar className='h-3 w-3' />
                    {t('localAccount')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                {t('actions')}
              </CardTitle>
              <CardDescription>{t('actionsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col sm:flex-row gap-2'>
                <Button
                  variant='outline'
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Settings className='h-4 w-4 mr-2' />
                  {t('settingsBtn')}
                </Button>
                <Button asChild variant='outline'>
                  <CustomLink href='/chat'>{t('viewChatBtn')}</CustomLink>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showSettingsModal && (
        <SystemSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  )
}
