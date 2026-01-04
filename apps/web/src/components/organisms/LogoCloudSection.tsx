'use client'

import { SectionWrapper, LogoCloud } from '@/components/molecules'
import {
  Code2,
  Server,
  FileCode,
  Container,
  Database,
  Cloud,
  Cpu,
  Zap,
} from 'lucide-react'

export function LogoCloudSection() {
  const logos = [
    { name: 'Next.js', icon: <Code2 className='h-5 w-5' /> },
    { name: 'React', icon: <Zap className='h-5 w-5' /> },
    { name: 'TypeScript', icon: <FileCode className='h-5 w-5' /> },
    { name: 'Go', icon: <Cpu className='h-5 w-5' /> },
    { name: 'Docker', icon: <Container className='h-5 w-5' /> },
    { name: 'Kubernetes', icon: <Cloud className='h-5 w-5' /> },
    { name: 'PostgreSQL', icon: <Database className='h-5 w-5' /> },
    { name: 'Redis', icon: <Server className='h-5 w-5' /> },
  ]

  return (
    <SectionWrapper variant='card' className='py-12'>
      <LogoCloud title='技术栈支持' logos={logos} />
    </SectionWrapper>
  )
}
