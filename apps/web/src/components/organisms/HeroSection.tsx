'use client'

import { useSession } from 'next-auth/react'
import { motion } from 'motion/react'
import { Badge, Button } from '@/components/atoms'
import { Zap, ArrowRight, Github } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CustomLink, GradientBlob, Flow } from '@/components/molecules'
import type { Node, Edge } from '@xyflow/react'

export function HeroSection() {
  const { data: session } = useSession()
  const t = useTranslations('HomePage')
  const tFlow = useTranslations('HomePage.flowSection')

  const initialNodes: Node[] = [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 100, y: 200 },
      data: { label: tFlow('trigger'), desc: tFlow('triggerDesc') },
    },
    {
      id: 'agent',
      type: 'agent',
      position: { x: 500, y: 200 },
      data: { label: tFlow('agent'), desc: tFlow('agentDesc') },
    },
    {
      id: 'isManager',
      type: 'decision',
      position: { x: 900, y: 200 },
      data: { label: tFlow('isManager') },
    },
    {
      id: 'addToChannel',
      type: 'slack',
      position: { x: 1150, y: 0 },
      data: { label: tFlow('addToChannel'), desc: tFlow('addToChannelDesc') },
    },
    {
      id: 'updateProfile',
      type: 'slack',
      position: { x: 1150, y: 400 },
      data: { label: tFlow('updateProfile'), desc: tFlow('updateProfileDesc') },
    },
    {
      id: 'anthropic',
      type: 'service',
      position: { x: 100, y: 600 },
      data: { label: tFlow('anthropic'), desc: tFlow('anthropicDesc') },
    },
    {
      id: 'postgres',
      type: 'service',
      position: { x: 400, y: 600 },
      data: { label: tFlow('postgres'), desc: tFlow('postgresDesc') },
    },
    {
      id: 'entra',
      type: 'service',
      position: { x: 700, y: 600 },
      data: { label: tFlow('entra'), desc: tFlow('entraDesc') },
    },
    {
      id: 'jira',
      type: 'service',
      position: { x: 1000, y: 600 },
      data: { label: tFlow('jira'), desc: tFlow('jiraDesc') },
    },
  ]

  const initialEdges: Edge[] = [
    { id: 'e1', source: 'trigger', target: 'agent', animated: true },
    { id: 'e2', source: 'agent', target: 'isManager', animated: true },
    {
      id: 'e3',
      source: 'isManager',
      target: 'addToChannel',
      label: tFlow('isManagerTrue'),
      animated: true,
    },
    {
      id: 'e4',
      source: 'isManager',
      target: 'updateProfile',
      label: tFlow('isManagerFalse'),
      animated: true,
    },
    {
      id: 'e5',
      source: 'agent',
      target: 'anthropic',
      label: tFlow('anthropicDesc'),
      targetHandle: 'serviceTop',
      sourceHandle: 'model',
      animated: true,
    },
    {
      id: 'e6',
      source: 'agent',
      target: 'postgres',
      label: tFlow('postgresDesc'),
      targetHandle: 'serviceTop',
      sourceHandle: 'memory',
      animated: true,
    },
    {
      id: 'e7',
      source: 'agent',
      target: 'entra',
      label: tFlow('entraDesc'),
      targetHandle: 'serviceTop',
      sourceHandle: 'tool',
      animated: true,
    },
    {
      id: 'e8',
      source: 'agent',
      target: 'jira',
      label: tFlow('jiraDesc'),
      targetHandle: 'serviceTop',
      sourceHandle: 'tool',
      animated: true,
    },
  ]

  return (
    <section className='relative overflow-hidden h-[200vh] w-full px-4 sm:px-6 lg:px-8 mb-16 flex flex-col gap-10'>
      {/* 背景光斑 */}
      <div className='absolute inset-0 pointer-events-none'>
        <GradientBlob
          color='primary'
          size='lg'
          position='top-left'
          className='left-1/2 top-[-10vw] -translate-x-1/2'
        />
        <GradientBlob
          color='secondary'
          size='md'
          position='top-right'
          className='left-[60vw] top-[30vw]'
        />
        <GradientBlob color='accent' size='md' position='bottom-right' />
      </div>

      {/* 首屏 */}
      <div className='p-4 flex flex-col justify-center gap-8 backdrop-blur-xs z-9 h-[100vh]'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant='secondary' className='mb-4 font-body'>
            <Zap className='h-4 w-4 mr-2' />
            Intelligent Workflow Orchestration
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
          className='text-4xl md:text-6xl font-display font-bold text-foreground mb-6 max-w-4xl leading-tight'
        >
          {t('title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.33, 1, 0.68, 1] }}
          className='text-xl md:text-2xl font-body font-medium text-muted-foreground mb-8 max-w-3xl leading-relaxed'
        >
          {t('subtitle')}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.33, 1, 0.68, 1] }}
          className='text-lg font-sans text-muted-foreground/80 mb-12 max-w-2xl leading-relaxed'
        >
          {t('description')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.6,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className='flex flex-col sm:flex-row gap-8 justify-center z-10'
        >
          {session ? (
            <>
              <CustomLink href='/dashboard'>
                <Button size='lg' className='group font-body font-semibold'>
                  进入仪表板
                  <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                </Button>
              </CustomLink>
              <CustomLink href='/workflows'>
                <Button
                  variant='outline'
                  size='lg'
                  className='font-body font-medium'
                >
                  查看工作流
                </Button>
              </CustomLink>
            </>
          ) : (
            <>
              <CustomLink href='/auth/signin'>
                <Button size='lg' className='group font-body font-semibold'>
                  {t('cta.getStarted')}
                  <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                </Button>
              </CustomLink>
              <CustomLink
                href='https://github.com/indulgeback/telos'
                target='_blank'
              >
                <Button
                  variant='outline'
                  size='lg'
                  className='font-body font-medium'
                >
                  <Github className='mr-2 h-4 w-4' />
                  GitHub
                </Button>
              </CustomLink>
            </>
          )}
        </motion.div>
      </div>

      {/* 流程图 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className='w-full h-[100vh] z-10'
      >
        <Flow
          className='w-full h-full'
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          showBackground
        />
      </motion.div>
    </section>
  )
}
