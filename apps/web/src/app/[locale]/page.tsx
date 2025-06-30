import HeroSection from '@/components/organisms/HeroSection'
import FeaturesSection from '@/components/organisms/FeaturesSection'
import TechStackSection from '@/components/organisms/TechStackSection'
import QuickStartSection from '@/components/organisms/QuickStartSection'
import FooterSection from '@/components/organisms/FooterSection'
import { Header } from '@/components'

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <TechStackSection />
      <QuickStartSection />
      <FooterSection />
    </div>
  )
}
