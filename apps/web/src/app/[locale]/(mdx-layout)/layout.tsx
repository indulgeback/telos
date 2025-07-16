import { MDXProseProvider } from '@/components/providers'

export default function MDXLayout({ children }: { children: React.ReactNode }) {
  return <MDXProseProvider>{children}</MDXProseProvider>
}
