import {
  Header,
  HeroSection,
  FeaturesSection,
  TechStackSection,
  QuickStartSection,
  FooterSection,
} from '@/components/organisms'

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
