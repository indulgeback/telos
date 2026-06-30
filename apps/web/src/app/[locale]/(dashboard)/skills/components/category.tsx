'use client'

import {
  PenLine,
  Code2,
  Zap,
  Briefcase,
  Languages,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/**
 * 商店分类元数据 —— 对齐参考稿的「学习 / 写作 / 图片 / ...」分类网格。
 *
 * youmind 设计规范:色彩只用于内容,不用于 chrome;故分类图标保持
 * 彩色但无背景填充,图标/文字仍是墨色,整体克制。
 */
export interface SkillCategory {
  /** id,对应技能 metadata.category */
  id: string
  /** 分类显示用的图标 */
  icon: LucideIcon
  /** 图标颜色,低饱和的语义色 */
  iconColor: string
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'writing',
    icon: PenLine,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'coding',
    icon: Code2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'productivity',
    icon: Zap,
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'office',
    icon: Briefcase,
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'translation',
    icon: Languages,
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
]

const DEFAULT_CATEGORY: SkillCategory = {
  id: 'all',
  icon: Sparkles,
  iconColor: 'text-neutral-700 dark:text-neutral-300',
}

/**
 * 根据分类 id 获取其元数据;未命中时回退到 all 的中性样式,
 * 这样即使技能写了未定义的 category 也不会渲染异常。
 */
export function getCategoryMeta(id: string | undefined): SkillCategory {
  if (!id) return DEFAULT_CATEGORY
  const targetId = id === 'data' ? 'office' : id
  return SKILL_CATEGORIES.find(c => c.id === targetId) ?? DEFAULT_CATEGORY
}
