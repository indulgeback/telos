'use client'
import { useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { animate } from 'animejs'
import { Badge, Button } from '@/components/atoms'
import { Zap, ArrowRight, Github } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CustomLink } from '@/components/molecules'
import { Flow } from '@/components/molecules'
import type { Node, Edge } from '@xyflow/react'

export function HeroSection() {
  const { data: session } = useSession()
  const t = useTranslations('HomePage')
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const descRef = useRef(null)
  const btnsRef = useRef(null)
  const flowRef = useRef(null)
  // 新增：为三个光斑添加ref
  const mainSpotRef = useRef(null)
  const smallSpotRef = useRef(null)
  const cornerSpotRef = useRef(null)

  useEffect(() => {
    // 标题动画
    if (titleRef.current) {
      animate(titleRef.current, {
        translateY: [60, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutCubic',
      })
    }
    // 副标题动画
    if (subtitleRef.current) {
      animate(subtitleRef.current, {
        translateY: [40, 0],
        opacity: [0, 1],
        duration: 800,
        delay: 400,
        easing: 'easeOutCubic',
      })
    }
    // 描述动画
    if (descRef.current) {
      animate(descRef.current, {
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 700,
        delay: 500,
        easing: 'easeOutCubic',
      })
    }
    // 按钮动画
    if (btnsRef.current) {
      animate(btnsRef.current, {
        scale: [0.95, 1],
        opacity: [0, 1],
        duration: 600,
        delay: 600,
        easing: 'easeOutBack',
      })
    }
    if (flowRef.current) {
      animate(flowRef.current, {
        scale: [0.95, 1],
        opacity: [0, 1],
        duration: 600,
        delay: 600,
        easing: 'easeOutBack',
      })
    }
    // 新增：三个光斑的循环移动呼吸动画
    if (mainSpotRef.current) {
      animate(mainSpotRef.current, {
        y: '-30%',
        scale: [
          { value: 1.08, duration: 2000 },
          { value: 1, duration: 2000 },
        ],
        opacity: [
          { value: 0.95, duration: 2000 },
          { value: 0.85, duration: 2000 },
        ],
        easing: 'easeInOutSine',
        alternate: true,
        loop: true,
        delay: 0,
      })
    }
    if (smallSpotRef.current) {
      animate(smallSpotRef.current, {
        x: '40%',
        scale: [
          { value: 1.12, duration: 2200 },
          { value: 1, duration: 2200 },
        ],
        opacity: [
          { value: 0.85, duration: 2200 },
          { value: 0.7, duration: 2200 },
        ],
        easing: 'easeInOutSine',
        alternate: true,
        loop: true,
        delay: 400,
      })
    }
    if (cornerSpotRef.current) {
      animate(cornerSpotRef.current, {
        y: '30%',
        scale: [
          { value: 1.1, duration: 1800 },
          { value: 1, duration: 1800 },
        ],
        opacity: [
          { value: 0.85, duration: 1800 },
          { value: 0.7, duration: 1800 },
        ],
        easing: 'easeInOutSine',
        alternate: true,
        loop: true,
        delay: 800,
      })
    }
  }, [])

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
    <section
      className='relative overflow-hidden h-[200vh] w-full px-4 sm:px-6 lg:px-8 mb-16 flex flex-col gap-10'
      id='hero'
    >
      {/* 渐变+多层光斑背景层 */}
      <div className='absolute inset-0 pointer-events-none'>
        {/* 主色大光斑 */}
        <div
          ref={mainSpotRef}
          className='absolute left-1/2 top-[-10vw] w-[50vw] h-[30vw] max-w-5xl -translate-x-1/2 bg-gradient-to-br from-[#40669bcc] to-transparent rounded-full blur-[120px] opacity-90'
        />
        {/* 小光斑 */}
        <div
          ref={smallSpotRef}
          className='absolute left-[60vw] top-[30vw] w-[40vw] h-[30vw] bg-[#d78ceeb3] rounded-full blur-[80px] opacity-80'
        />
        {/* 右下角次级光斑 */}
        <div
          ref={cornerSpotRef}
          className='absolute right-[-8vw] bottom-[-8vw] w-[40vw] h-[30vw] bg-[#5a7fae99] rounded-full blur-[100px] opacity-80'
        />
      </div>

      {/* 首屏：标题与描述 */}
      <div className='p-4 flex flex-col justify-center gap-8 backdrop-blur-xs z-9 h-[100vh]'>
        <Badge variant='secondary' className='mb-4'>
          <Zap className='h-4 w-4 mr-2' />
          Intelligent Workflow Orchestration
        </Badge>
        <h1
          ref={titleRef}
          className='text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 max-w-4xl'
        >
          {t('title')}
        </h1>
        <p
          ref={subtitleRef}
          className='text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl'
        >
          {t('subtitle')}
        </p>
        <p
          ref={descRef}
          className='text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-2xl'
        >
          {t('description')}
        </p>
        <div
          ref={btnsRef}
          className='flex flex-col sm:flex-row gap-8 justify-center z-10'
        >
          {session ? (
            <>
              <CustomLink href='/dashboard'>
                <Button size='lg' className='group'>
                  进入仪表板
                  <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                </Button>
              </CustomLink>
              <CustomLink href='/workflows'>
                <Button variant='outline' size='lg'>
                  查看工作流
                </Button>
              </CustomLink>
            </>
          ) : (
            <>
              <CustomLink href='/auth/signin'>
                <Button size='lg' className='group'>
                  {t('cta.getStarted')}
                  <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                </Button>
              </CustomLink>
              <CustomLink
                href='https://github.com/indulgeback/telos'
                target='_blank'
              >
                <Button variant='outline' size='lg'>
                  <Github className='mr-2 h-4 w-4' />
                  GitHub
                </Button>
              </CustomLink>
            </>
          )}
        </div>
      </div>

      {/* 流程图 Demo */}
      <Flow
        ref={flowRef}
        className='w-full h-[100vh] z-10'
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        showBackground
      />
    </section>
  )
}
