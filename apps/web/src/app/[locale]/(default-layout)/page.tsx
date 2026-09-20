import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingPage } from '@/components/organisms/LandingPage'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('LandingStudio')
  return {
    title: `Telos — ${t('title')} ${t('titleAccent')}`,
    description: t('intro'),
  }
}

export default function Home() {
  return <LandingPage />
}
