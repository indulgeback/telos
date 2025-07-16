import '@/styles/mdx-prose.css'

export function MDXProseProvider({ children }: { children: React.ReactNode }) {
  return <div className='mdx-prose'>{children}</div>
}
