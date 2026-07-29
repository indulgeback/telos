import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../config/index.js'
import { prisma } from './db.js'

// =============================================================================
// 系统级 Skill 自动 seed (商店预制内容)
// =============================================================================
// 启动时自动 seed 17 个商店技能 + 1 个内置能力 (skill-creator).
// 仿照 seed-skills.mjs 的逻辑, 但作为 ensure 函数在启动时幂等执行.
// 解决线上新部署 skill 商店为空的问题.
// =============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url))
// seed-skills 目录在 services/agent-service/scripts/seed-skills/
// 从 dist/services/default-skills.js 往上两级到 agent-service 根, 再进 scripts/seed-skills/
// 容器里路径: /app/services/agent-service/dist/services/default-skills.js
//          → .. = /app/services/agent-service/dist/
//          → .. = /app/services/agent-service/
//          → scripts/seed-skills = /app/services/agent-service/scripts/seed-skills
const SKILLS_DIR = join(__dirname, '..', '..', 'scripts', 'seed-skills')

/**
 * 分类映射:name → category.
 * 必须与前端 apps/web/.../skills/components/category.tsx 的 SKILL_CATEGORIES id 一致.
 */
const CATEGORY_MAP: Record<string, string> = {
  // office:文档、演示、表格与 PDF 处理
  pdf: 'office',
  docx: 'office',
  pptx: 'office',
  xlsx: 'office',
  // coding:编程与开发
  'web-artifacts-builder': 'coding',
  'mcp-builder': 'coding',
  'skill-creator': 'coding',
  'frontend-design': 'coding',
  'webapp-testing': 'coding',
  'algorithmic-art': 'coding',
  'react-best-practices': 'coding',
  // writing:写作
  'doc-coauthoring': 'writing',
  'internal-comms': 'writing',
  research: 'writing',
  // productivity:生产力
  brainstorming: 'productivity',
  'canvas-design': 'productivity',
  'theme-factory': 'productivity',
  // translation:翻译
  translator: 'translation',
}

interface RawSkill {
  name: string
  description: string
  content: string
  metadata: {
    category: string
    source: string
    license: string
    hidden?: boolean
    builtin?: boolean
  }
}

/**
 * 极简 YAML frontmatter 解析器(扁平 key: value, 不依赖 gray-matter).
 */
function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string>
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, content: raw }
  }
  const [, fmBlock, body] = match
  const frontmatter: Record<string, string> = {}
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    frontmatter[key] = val.replace(/^["']|["']$/g, '').trim()
  }
  return { frontmatter, content: body.trim() }
}

/** 从 markdown 文件加载一个 skill */
function loadSkillFromFile(fileName: string): RawSkill {
  const filePath = join(SKILLS_DIR, fileName)
  const raw = readFileSync(filePath, 'utf8')
  const { frontmatter, content } = parseFrontmatter(raw)

  const name = frontmatter.name || basename(fileName, '.md')
  const category = CATEGORY_MAP[name] || 'productivity'

  return {
    name,
    description: frontmatter.description || name,
    content,
    metadata: {
      category,
      source: frontmatter.homepage || 'anthropics/skills',
      license: frontmatter.license || 'See source',
    },
  }
}

/**
 * skill-creator:内置能力, 不进商店(metadata.hidden = true), 默认绑定到所有 agent.
 * 用 $skill-creator 触发.
 */
const BUILTIN_SKILL_CREATOR: RawSkill = {
  name: 'skill-creator',
  description:
    '创建新的技能或修改现有技能。当用户想要创建一个 skill、把某个流程沉淀成技能、或编辑优化已有技能时使用。可通过 $skill-creator 显式触发。',
  metadata: {
    category: 'coding',
    source: 'builtin',
    license: 'Apache-2.0',
    hidden: true, // 不在商店展示
    builtin: true,
  },
  content: `# Skill Creator

帮助用户创建新的技能(skill),或将某个工作流程沉淀为可复用的技能。

## 何时使用

- 用户说"创建一个技能""把这个流程变成 skill""我想做个能做 X 的技能"
- 用户通过 \`$skill-creator\` 显式触发
- 用户想编辑/改进一个已有的技能

## 核心创建流程

只走核心创建流程(本环境不支持 eval/benchmark 等高级功能)。

### 1. 捕捉意图
先搞清楚四件事(可从对话历史中提取,不够再问用户):
1. 这个技能让 agent 能做什么?
2. 什么时候应该触发?(用户会说什么话/什么场景)
3. 期望的输出格式是什么?
4. 有没有示例输入输出?

### 2. 访谈与澄清
主动追问边界情况、输入输出格式、示例、成功标准、依赖。一次问清楚,别挤牙膏。

### 3. 写 SKILL.md
基于访谈结果,产出完整的 SKILL.md。直接输出一个 markdown 代码块,内容是一份完整的 SKILL.md(带 frontmatter),这样前端能识别并提供"保存为技能"按钮。

#### 写作要点
- description 是触发核心:既写"做什么"也写"何时用"。
- 用祈使句:"做 X"而不是"你应该做 X"。
- 解释 why:模型理解 why 比死板规则更有效。
- 保持精简:SKILL.md 理想 < 500 行。
- 包含示例。

### 4. 确认与保存
产出 SKILL.md 后,告诉用户确认无误后点击代码块下方的「保存为技能」按钮即可入库。

## 修改已有技能
先让用户描述现有技能的问题/期望改进点,产出改进后的完整 SKILL.md(保留原 name)。

## 不要做的事
- 不要跑 eval / benchmark / description 优化
- 不要写 Python 脚本去测试
- 不要创建子代理(subagent)
- 专注产出高质量的 SKILL.md 内容本身`,
}

/**
 * 加载所有系统 skill (17 个商店 + 1 个内置 skill-creator).
 * 如果 seed-skills 目录不存在(如某些精简部署), 只返回内置的 skill-creator.
 */
function loadAllSystemSkills(): RawSkill[] {
  const skills: RawSkill[] = []

  // 1. 从 markdown 文件加载商店技能
  try {
    const files = readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'))
    for (const f of files) {
      try {
        skills.push(loadSkillFromFile(f))
      } catch (e) {
        logger.warn({
          msg: 'Failed to load system skill file',
          file: f,
          err: e instanceof Error ? e.message : String(e),
        })
      }
    }
  } catch (e) {
    logger.warn({
      msg: 'System skills directory not found, only seeding builtin skill-creator',
      dir: SKILLS_DIR,
      err: e instanceof Error ? e.message : String(e),
    })
  }

  // 2. 内置能力 skill-creator (硬编码)
  skills.push(BUILTIN_SKILL_CREATOR)

  return skills
}

let systemSkillsEnsured = false

/**
 * 确保系统级 skill 存在 (幂等).
 *
 * - 先查后插/更新 (ownerId=null 时复合 unique 约束不生效, 不能用 upsert where)
 * - 不删除用户自建的 skill (只同步 owner_id=null 的系统级)
 * - skill-creator 还会补绑到所有现有 agent
 *
 * 失败只 log 不 throw (DB/文件系统未就绪时不阻断启动).
 */
export async function ensureSystemSkills(): Promise<void> {
  if (systemSkillsEnsured) return

  try {
    const skills = loadAllSystemSkills()
    logger.info({
      msg: 'Ensuring system skills',
      count: skills.length,
    })

    let created = 0
    let updated = 0

    for (const s of skills) {
      const existing = await prisma.skill.findFirst({
        where: { ownerId: null, name: s.name },
        select: { id: true },
      })

      if (existing) {
        await prisma.skill.update({
          where: { id: existing.id },
          data: {
            description: s.description,
            content: s.content,
            metadata: s.metadata,
          },
        })
        updated++
      } else {
        await prisma.skill.create({
          data: {
            name: s.name,
            description: s.description,
            content: s.content,
            metadata: s.metadata,
            enabled: true,
            ownerId: null,
          },
        })
        created++
      }
    }

    // skill-creator 补绑到所有现有 agent
    const skillCreator = await prisma.skill.findFirst({
      where: { ownerId: null, name: 'skill-creator' },
      select: { id: true },
    })
    let bound = 0
    if (skillCreator) {
      const agents = await prisma.agent.findMany({ select: { id: true } })
      for (const a of agents) {
        const r = await prisma.agentSkill.createMany({
          data: {
            agentId: a.id,
            skillId: skillCreator.id,
            enabled: true,
            sortOrder: 0,
          },
          skipDuplicates: true,
        })
        if (r.count > 0) bound++
      }
    }

    systemSkillsEnsured = true
    logger.info({
      msg: 'System skills ensured',
      total: skills.length,
      created,
      updated,
      skillCreatorBound: bound,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error({
      msg: 'Failed to ensure system skills',
      err: errorMessage,
    })
    // 不抛出, 避免阻断启动
  }
}
