import { Link } from '@/i18n/navigation'

interface CustomLinkProps {
  href: string
  children: React.ReactNode
  target?: '_self' | '_blank' | '_parent' | '_top'
  className?: string
}

export function CustomLink({
  href,
  children,
  target = '_self',
  className = '',
}: CustomLinkProps) {
  return (
    <Link href={href} target={target} className={className}>
      {children}
    </Link>
  )
}
