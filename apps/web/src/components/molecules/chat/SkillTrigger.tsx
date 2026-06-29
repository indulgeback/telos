'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/atoms'
import { agentService, type AgentSkill } from '@/service/agent'
import { Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillTriggerProps {
  /** 当前输入框文本 */
  input: string
  /** 当前 agent id(决定加载哪些 skill) */
  agentId: string | null
  /** 选中技能后回填 input */
  onPick: (skillName: string) => void
  /** 键盘导航回调:返回 true 表示已消费事件(阻止默认行为) */
  onNavigate?: (direction: 'up' | 'down' | 'enter' | 'escape') => boolean
  /** 注册查询函数,供父组件触发导航 */
  registerControls?: (controls: {
    move: (direction: 'up' | 'down' | 'enter' | 'escape') => void
    isOpen: () => boolean
  }) => void
}

/**
 * 聊天框 $ 技能触发器(对标 Codex 的 $ mention 机制)。
 *
 * 当用户在输入框末尾输入 $ 或 $xxx(正在输入技能名)时,
 * 弹出当前 agent 已绑定的技能列表,方向键导航 + 回车选择。
 * 选中后把 $skill-name 写入 input(交给后端 parseExplicitSkillTrigger 解析)。
 */
export function SkillTrigger({
  input,
  agentId,
  onPick,
  registerControls,
}: SkillTriggerProps) {
  const t = useTranslations('Skill')
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 检测输入框末尾是否是 $ 或 $xxx(技能触发模式)
  const triggerMatch = input.match(/\$([a-z0-9-]*)$/i)
  const isOpen = triggerMatch !== null

  // 加载当前 agent 的技能
  const loadSkills = useCallback(async () => {
    if (!agentId) {
      setSkills([])
      setLoaded(true)
      return
    }
    try {
      const data = await agentService.getAgentSkills(agentId)
      setSkills(data.skills.filter(s => s.enabled))
    } catch {
      setSkills([])
    } finally {
      setLoaded(true)
    }
  }, [agentId])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // 根据 $ 后已输入的文本过滤
  const query = triggerMatch?.[1]?.toLowerCase() ?? ''
  const filtered = skills.filter(
    (s): s is typeof s & { skill: NonNullable<typeof s.skill> } =>
      !!s.skill && s.skill.name.toLowerCase().includes(query)
  )

  // 重置选中索引
  useEffect(() => {
    if (isOpen) setSelectedIndex(0)
  }, [isOpen, query])

  // 暴露导航控制给父组件(ChatView 注入键盘事件)
  useEffect(() => {
    if (!registerControls) return
    registerControls({
      move: direction => {
        if (!isOpen || filtered.length === 0) return
        if (direction === 'up') {
          setSelectedIndex(i => (i <= 0 ? filtered.length - 1 : i - 1))
        } else if (direction === 'down') {
          setSelectedIndex(i => (i >= filtered.length - 1 ? 0 : i + 1))
        } else if (direction === 'enter') {
          const picked = filtered[selectedIndex]
          if (picked?.skill?.name) {
            onPick(picked.skill.name)
          }
        }
      },
      isOpen: () => isOpen,
    })
  }, [registerControls, isOpen, filtered, selectedIndex, onPick])

  // 滚动选中项到可视区
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-skill-idx="${selectedIndex}"]`
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // 不触发时不渲染
  if (!isOpen || !loaded) return null

  return (
    <Popover open={filtered.length > 0}>
      <PopoverAnchor asChild>
        <span className='invisible absolute' aria-hidden />
      </PopoverAnchor>
      <PopoverContent
        side='top'
        align='start'
        sideOffset={8}
        className='w-72 p-1'
        onOpenAutoFocus={e => e.preventDefault()}
      >
        {filtered.length === 0 ? (
          <div className='py-3 text-center text-xs text-muted-foreground'>
            {t('chatTrigger.empty')}
          </div>
        ) : (
          <div ref={listRef} className='max-h-60 overflow-y-auto'>
            {filtered.map((s, idx) => (
              <button
                key={s.skill_id}
                type='button'
                data-skill-idx={idx}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => onPick(s.skill.name)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                  idx === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <Wand2 className='size-3.5 shrink-0 text-primary' />
                <span className='font-mono'>{s.skill.name}</span>
                <span className='line-clamp-1 text-xs text-muted-foreground'>
                  {s.skill.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
