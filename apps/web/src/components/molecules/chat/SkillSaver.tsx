'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { agentService } from '@/service/agent'
import { Button } from '@/components/atoms'
import { Bookmark, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SkillSaverProps {
  /** 助手消息的文本内容(可能含 SKILL.md 代码块) */
  text: string
}

interface ParsedSkill {
  name: string
  description: string
  content: string
}

/**
 * 解析文本中是否包含 SKILL.md。
 * 检测策略:
 *  1. 找到 markdown 代码块(```markdown ... ```)
 *  2. 代码块内含 YAML frontmatter(--- ... ---),且 frontmatter 有 name
 * 则视为 skill-creator 产出的技能草稿。
 */
function parseSkillFromText(text: string): ParsedSkill | null {
  // 匹配 ```markdown / ```md 围栏代码块
  const fenceMatch = text.match(/```(?:markdown|md)\s*\n([\s\S]*?)```/i)
  const candidate = fenceMatch ? fenceMatch[1] : text

  // 解析 frontmatter ---\n...\n---
  const fmMatch = candidate.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!fmMatch) return null
  const [, fmBlock, body] = fmMatch

  const frontmatter: Record<string, string> = {}
  for (const line of fmBlock.split(/\n/)) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    frontmatter[key] = val.replace(/^["']|["']$/g, '').trim()
  }

  const name = frontmatter.name
  if (!name) return null

  return {
    name,
    description: frontmatter.description || name,
    content: body.trim(),
  }
}

/**
 * 当助手消息含 SKILL.md 时,在消息下方渲染「保存为技能」按钮。
 * 点击后调 createSkill 入库。已保存则显示「已保存」。
 *
 * 仅在客户端渲染,无副作用检测;未命中 SKILL.md 时返回 null(不占位)。
 */
export function SkillSaver({ text }: SkillSaverProps) {
  const t = useTranslations('Skill')
  const parsed = parseSkillFromText(text)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  if (!parsed) return null

  const handleSave = async () => {
    setStatus('saving')
    try {
      await agentService.createSkill({
        name: parsed.name,
        description: parsed.description,
        markdown: parsed.content,
      })
      setStatus('saved')
      toast.success(t('saver.saved', { name: parsed.name }))
    } catch (error) {
      setStatus('idle')
      toast.error(
        error instanceof Error ? error.message : t('saver.saveFailed')
      )
    }
  }

  if (status === 'saved') {
    return (
      <div className='mt-3'>
        <Button variant='outline' size='sm' disabled className='gap-1.5'>
          <Check className='size-3.5' />
          {t('saver.savedLabel')}
        </Button>
      </div>
    )
  }

  return (
    <div className='mt-3'>
      <Button
        variant='outline'
        size='sm'
        onClick={handleSave}
        disabled={status === 'saving'}
        className='gap-1.5'
      >
        {status === 'saving' ? (
          <Loader2 className='size-3.5 animate-spin' />
        ) : (
          <Bookmark className='size-3.5' />
        )}
        {t('saver.saveAsSkill')}
      </Button>
    </div>
  )
}
