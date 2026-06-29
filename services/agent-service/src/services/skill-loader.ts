import { tool, type Tool } from '@openai/agents'
import { z } from 'zod'
import { prisma } from './db.js'
import type { AgentRunPersistence } from './persistence.js'
import { asRecord } from '../utils/json.js'

/**
 * 显式 skill 触发前缀(对标 Codex 的 $skill-name 语法)。
 *
 * 仅匹配消息开头的 `$xxx`,且 skill 名只能由小写字母、数字、连字符组成。
 * 例:
 *   "$ace-music 生成一首歌"  → { skillName: "ace-music", message: "生成一首歌" }
 *   "$ace-music"             → { skillName: "ace-music", message: "" }
 *   "帮我算 $5 + 3"          → { skillName: null,       message: "帮我算 $5 + 3" }
 */
export function parseExplicitSkillTrigger(input: string): {
  skillName: string | null
  message: string
} {
  const match = input.trim().match(/^\$([a-z0-9-]+)(?:\s+([\s\S]+))?$/i)
  if (!match) return { skillName: null, message: input }

  const skillName = match[1]
  const message = match[2] ?? ''
  return { skillName, message }
}

/**
 * 构建 L1 元数据索引块(渐进式披露的核心)。
 *
 * 只注入每个 skill 的 name + description(几十 token/skill),
 * 指引模型在需要时通过 execute_skill 工具按需加载全文。
 */
export function buildSkillIndexBlock(
  skills: { name: string; description: string }[]
): string {
  const lines = skills.map(s => `- ${s.name}: ${s.description}`).join('\n')
  return (
    '# Available Skills\n' +
    '以下技能可用。每个技能有名称和简短说明。\n' +
    '要使用某技能,请调用 execute_skill 工具并传入技能名称,获取完整指令后遵循执行。\n' +
    '仅当任务明确匹配技能描述时才调用,避免不必要的调用。\n\n' +
    lines
  )
}

/**
 * 构建显式激活块(用户通过 $skill-name 触发时使用)。
 *
 * 把匹配到的 skill 全文直接注入 system prompt(等价于已通过 execute_skill 激活),
 * 让模型跳过"是否调用 skill"的判断,直接按指令执行。
 */
export function buildSkillActivatedBlock(skill: {
  name: string
  description: string
  content: string
}): string {
  return (
    `# Activated Skill: ${skill.name}\n` +
    `${skill.description}\n\n` +
    `---\n${skill.content}\n\n` +
    '---\n用户已显式激活此技能,请遵循其指令完成任务。'
  )
}

interface SkillAsset {
  path: string
  type: string
}

/**
 * 从 Skill.metadata 解析资源文件清单(兼容未定义 / 旧数据)。
 *
 * 约定 metadata.assets 为数组,每项形如 { path: "references/api.md", type: "markdown" }。
 * 当前(P0)不强制 schema,留作未来扩展点;无数据时返回空数组。
 */
function parseAssetsFromMetadata(metadata: unknown): SkillAsset[] {
  const meta = asRecord(metadata)
  const raw = meta.assets
  if (!Array.isArray(raw)) return []

  const assets: SkillAsset[] = []
  for (const item of raw) {
    const obj = asRecord(item)
    const path = typeof obj.path === 'string' ? obj.path : ''
    const type = typeof obj.type === 'string' ? obj.type : 'file'
    if (path) assets.push({ path, type })
  }
  return assets
}

/**
 * 构造 execute_skill 工具(渐进式披露的 L2 关键)。
 *
 * 模型自主判断任务匹配某 skill 时调用此工具,从 DB 按名加载 skill 全文,
 * 连同资源文件清单一并返回,作为 tool result 注入下一轮对话。
 *
 * 查询限定在当前用户可见范围(自己的 + 系统级 ownerId IS NULL),避免跨用户读取。
 *
 * @param availableSkills 当前 agent 可用的 skill 元数据(用于生成动态 description)
 * @param persistence 可选,用于落库 tool_skill_start / tool_skill_end 事件
 * @param userId 可选,当前用户 ID,用于运行时可见范围过滤
 */
export function buildSkillLoaderTool(
  availableSkills: { name: string; description: string }[],
  persistence?: AgentRunPersistence,
  userId?: string
): Tool {
  const names = availableSkills.map(s => s.name).join(', ')
  return tool({
    name: 'execute_skill',
    description:
      '按名称加载并激活一个技能。当任务明确匹配某个可用技能时调用此工具,' +
      '返回该技能的完整指令,你应遵循这些指令完成任务。' +
      '可用技能: ' + names,
    parameters: z.object({
      name: z.string().describe('要激活的技能名称'),
    }),
    strict: false,
    async execute({ name }: { name: string }) {
      await persistence?.event('tool_skill_start', { skillName: name })

      const whereOwnerId = userId
        ? { OR: [{ ownerId: userId }, { ownerId: null }] }
        : { ownerId: null }

      const skill = await prisma.skill.findFirst({
        where: {
          name,
          enabled: true,
          ...whereOwnerId,
        },
      })

      if (!skill) {
        await persistence?.event('tool_skill_end', {
          skillName: name,
          found: false,
        })
        return `技能 '${name}' 未找到或已禁用。可用技能: ${names}`
      }

      const assets = parseAssetsFromMetadata(skill.metadata)
      const assetBlock = assets.length
        ? '\n\n## 可用资源文件\n' +
          assets.map(a => `- ${a.path} (${a.type})`).join('\n') +
          '\n使用 view_file 工具读取资源内容。'
        : ''

      await persistence?.event('tool_skill_end', {
        skillName: name,
        found: true,
      })

      return (
        `# Skill Activated: ${skill.name}\n` +
        `${skill.description}\n\n` +
        `---\n${skill.content}${assetBlock}`
      )
    },
  } as any)
}
