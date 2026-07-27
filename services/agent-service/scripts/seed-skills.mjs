// @ts-check
/**
 * Seed system skills (owner_id = NULL) into the Telos Skill store.
 *
 * 这些系统技能构成商店的第一批内容,用户可通过 POST /api/skills/:id/install
 * 克隆到自己的命名空间。脚本幂等,可重复运行。
 *
 * 用法:
 *   node scripts/seed-skills.mjs          # 执行 seed(写入 DB)
 *   node scripts/seed-skills.mjs --dry-run # 仅预览,不写入
 *
 * 数据来源见各文件顶部的 frontmatter(source/license)。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

// 加载 .env(与 src/services/db.ts 一致,DATABASE_URL 由 PrismaPg 适配器使用)
import 'dotenv/config'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = join(__dirname, 'seed-skills')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  log: ['error'],
})

/**
 * 分类映射:name → category。
 * category 必须与前端 category.tsx 的 SKILL_CATEGORIES id 一致:
 * writing / coding / productivity / office / translation
 */
const CATEGORY_MAP = {
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

/**
 * 极简 YAML frontmatter 解析器(只支持本批次用到的扁平 key: value)。
 * 避免引入 gray-matter 依赖。frontmatter 格式固定为:
 *   ---
 *   name: xxx
 *   description: "..."  (可能是带引号的字符串)
 *   license: ...
 *   ---
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    // 无 frontmatter,整体作为 content
    return { frontmatter: {}, content: raw }
  }
  const [, fmBlock, body] = match
  const frontmatter = {}
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    // 去掉首尾引号(支持 "..." 和 '...')
    frontmatter[key] = val.replace(/^["']|["']$/g, '').trim()
  }
  return { frontmatter, content: body.trim() }
}

function loadSkill(fileName) {
  const filePath = join(SKILLS_DIR, fileName)
  const raw = readFileSync(filePath, 'utf8')
  const { frontmatter, content } = parseFrontmatter(raw)

  const name = frontmatter.name || basename(fileName, '.md')
  const category = CATEGORY_MAP[name] || 'productivity'

  const metadata = {
    category,
    source: frontmatter.homepage
      ? frontmatter.homepage
      : 'anthropics/skills',
    license: frontmatter.license || 'See source',
  }

  return {
    name,
    description: frontmatter.description || name,
    content,
    metadata,
  }
}

/**
 * skill-creator:内置能力,不进商店(metadata.hidden = true),但默认绑定到所有 agent。
 * 用 $skill-creator 触发。这里用精简的核心创建流程(意图访谈→写 SKILL.md),
 * 舍弃 eval/benchmark/description 优化等托管环境跑不了的高级功能。
 */
const BUILTIN_SKILL_CREATOR = {
  name: 'skill-creator',
  description:
    '创建新的技能或修改现有技能。当用户想要创建一个 skill、把某个流程沉淀成技能、或编辑优化已有技能时使用。可通过 $skill-creator 显式触发。',
  metadata: {
    category: 'coding',
    source: 'builtin',
    license: 'Apache-2.0',
    // hidden: true → 不在商店展示(它是内置能力,非可安装的普通技能)
    hidden: true,
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

主动追问边界情况、输入输出格式、示例、成功标准、依赖。**一次问清楚,别挤牙膏。**

### 3. 写 SKILL.md

基于访谈结果,产出完整的 SKILL.md。**关键:直接输出一个 markdown 代码块,内容是一份完整的 SKILL.md**(带 frontmatter),这样前端能识别并提供"保存为技能"按钮。

格式:
\`\`\`markdown
---
name: my-skill
description: 技能做什么 + 什么时候触发(这是主要触发机制,要写得"主动"一点,覆盖各种可能的触发场景)
---

# 技能标题

## When to use
...(何时使用)

## 工作流程
...(具体步骤,用祈使句)

## 输出格式
...(如果需要固定格式)
\`\`\`

#### 写作要点
- **description 是触发核心**:既写"做什么"也写"何时用"。为了让模型在需要时确实触发,描述可以稍微"激进"一些。例如:"做 X。当用户提到 Y、Z、或想做任何与 W 相关的事时,务必使用本技能,即使用户没有明确说'技能'。"
- **用祈使句**:用"做 X"而不是"你应该做 X"。
- **解释 why**:尽量解释指令背后的原因,而不是堆砌 MUST/NEVER。模型足够聪明,理解 why 比死板规则更有效。
- **保持精简**:SKILL.md 理想 < 500 行。超了就分层级,给出明确的"下一步去哪看"的指引。
- **包含示例**:有用的示例能让技能更可靠。

### 4. 确认与保存

产出 SKILL.md 后,告诉用户:
> 我已生成技能草稿。请查看上方的 SKILL.md,如需调整告诉我。确认无误后点击代码块下方的「保存为技能」按钮即可入库。

如果用户要改,基于反馈迭代,直到满意。

## 修改已有技能

如果用户要改进一个已有技能:
- 先让用户描述现有技能的问题 / 期望改进点
- 产出改进后的完整 SKILL.md(保留原 name)
- 同样用 markdown 代码块输出,供用户保存

## 不要做的事

- 不要跑 eval / benchmark / description 优化(本环境不支持)
- 不要写 Python 脚本去测试
- 不要创建子代理(subagent)
- 专注产出高质量的 SKILL.md 内容本身`,
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const files = readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'))
  console.log(
    `[seed-skills] 发现 ${files.length} 个商店技能 + 1 个内置能力(skill-creator)${dryRun ? ' (dry-run 模式,不写入)' : ''}\n`
  )

  const storeSkills = files.map(loadSkill)
  // skill-creator 作为内置能力一并写入(但不进商店)
  const skills = [...storeSkills, BUILTIN_SKILL_CREATOR]

  // 校验:每个 skill 必须有 name/description/content/category
  for (const s of skills) {
    if (!s.name || !s.description || !s.content) {
      throw new Error(`[seed-skills] skill 数据不完整: ${JSON.stringify({ name: s.name, hasDesc: !!s.description, hasContent: !!s.content })}`)
    }
    const cat = s.metadata.category
    if (!['writing', 'coding', 'productivity', 'office', 'translation'].includes(cat)) {
      throw new Error(`[seed-skills] skill "${s.name}" 分类非法: ${cat}`)
    }
  }

  // 统计
  const byCat = {}
  for (const s of skills) {
    byCat[s.metadata.category] = (byCat[s.metadata.category] || 0) + 1
  }
  console.log('[seed-skills] 分类分布:')
  for (const [cat, count] of Object.entries(byCat)) {
    console.log(`  ${cat}: ${count}`)
  }
  console.log('')

  if (dryRun) {
    console.log('[seed-skills] (dry-run) 将写入以下系统技能:')
    for (const s of skills) {
      console.log(
        `  • ${s.name.padEnd(24)} [${s.metadata.category}]  ${s.description.slice(0, 60)}${s.description.length > 60 ? '…' : ''}`
      )
    }
    return
  }

  let created = 0
  let updated = 0
  for (const s of skills) {
    // 注:ownerId 为 null 时无法用复合唯一键 @@unique([ownerId, name]) 做 upsert where
    // (SQL 中 NULL 不参与唯一约束匹配),故采用「先查后插/更新」策略保证幂等。
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
      console.log(
        `  ↻ updated  ${s.name.padEnd(24)} [${s.metadata.category}]`
      )
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
      console.log(
        `  ✚ created  ${s.name.padEnd(24)} [${s.metadata.category}]`
      )
    }
  }

  console.log(
    `\n[seed-skills] 完成:新增 ${created} 个,更新 ${updated} 个,共 ${skills.length} 个系统技能。`
  )

  // 把 skill-creator(内置能力)补绑定到所有已存在的 agent,
  // 保证老 agent 也能用 $skill-creator 触发(新 agent 在创建时已自动绑定)。
  const skillCreator = await prisma.skill.findFirst({
    where: { ownerId: null, name: 'skill-creator' },
    select: { id: true },
  })
  if (skillCreator) {
    const agents = await prisma.agent.findMany({
      select: { id: true },
    })
    let bound = 0
    for (const a of agents) {
      const r = await prisma.agentSkill.createMany({
        data: { agentId: a.id, skillId: skillCreator.id, enabled: true, sortOrder: 0 },
        skipDuplicates: true,
      })
      if (r.count > 0) bound++
    }
    console.log(
      `[seed-skills] 已为 ${bound}/${agents.length} 个现有 agent 补绑 skill-creator。`
    )
  }
}

main()
  .catch(e => {
    console.error('[seed-skills] 失败:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
