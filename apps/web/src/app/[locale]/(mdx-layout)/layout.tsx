import { MDXProseProvider } from '@/components/providers'
import { MdxHeader } from '@/components/organisms/MdxHeader'

export default function MDXLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MdxHeader />
      <MDXProseProvider>{children}</MDXProseProvider>
    </>
  )
}
