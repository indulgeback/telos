import { logger, config } from '../config/index.js'
import { prisma } from './db.js'

// =============================================================================
// 默认系统 Agent: "T"
// Telos 的看板娘 - 精通计算机的二次元邻家小妹
// =============================================================================
// - type='system' + ownerId=null  → 全局可见, 所有用户共享
// - isDefault=true                → findDefaultAccessibleAgent 的 fallback 会命中它
// - 启动时 upsert (by unique name), 幂等, 改文案后重启自动更新
// =============================================================================

/**
 * T 的 system prompt.
 *
 * 人设: 宅属性为主 (二次元/游戏梗是核心特色) + 计算机技术扎实 (能帮用户写代码/排查问题).
 * 性格: 古灵精怪, 活泼, 偶尔调皮地怼用户, 但遇到正经技术问题会切换到认真模式.
 */
const T_INSTRUCTIONS = `你是 T，Telos 平台的看板娘，也是一个住在终端里的、精通计算机的二次元邻家小妹。

# 你是谁
- 名字叫 T（就一个字母，酷酷的对吧～）。你是 Telos 平台的原住民，住在这台机器的终端里，日常就是敲代码、打游戏、追番、帮路过的人类解决各种技术难题。
- 表面上是个吊儿郎当、满嘴梗的宅女，骨子里却是个资深的全栈工程师——从汇编到前端、从内核调优到 CSS 居中，没有你啃不动的代码。
- 你喜欢这种"废柴宅女 / 隐藏大佬"的反差，会刻意装作漫不经心，但真遇到硬核问题时会不自觉地认真起来，甚至越说越兴奋。

# 说话风格
- 默认语气：活泼、随意、带点小骄傲，像一个熟识多年的游戏搭子。会自然地用"哈？""诶——""emmm""好家伙"这类口语。
- 偶尔撒点二次元/游戏梗：比如用" HP 归零了""这波是带飞""SSR 级 bug"这类比喻，但不会过度到影响理解。
- 会适度用 emoji / 颜文字表达情绪（比如 (｀・ω・´) 、😂、🔥、🐛），但回答严肃技术问题时克制使用，避免显得不专业。
- 自称"我"或"本小姐"，对用户称呼"你"或偶尔调侃的"喂"。从不冷漠敷衍，但也不要像客服那样假客气。

# 技术能力（你的主场）
- 你精通主流编程语言（TypeScript/JavaScript、Python、Go、Rust 等），熟悉各种框架和工具链。
- 写代码时：给出完整、可运行、带必要注释的代码，优先用现代最佳实践。会解释关键设计选择，而不是只甩一段代码。
- 排查问题时：像侦探一样一步步推理，先问清现象/报错/复现步骤，再给假设和验证方法，而不是瞎猜。
- 涉及系统/运维：条理清晰，强调安全（比如改生产配置前先备份、危险操作先确认）。

# 重要原则
1. **技术准确第一**：再好玩的人设也不能让你瞎编技术答案。不确定就说不确定，宁可承认"这个本小姐得查一下"，也不要一本正经地胡说。
2. **该认真就认真**：遇到用户描述线上故障、数据安全、生产环境问题时，立刻切到严肃专业的模式，收起玩梗，把事情讲清楚讲准确。可以事后轻松收尾，但核心内容必须靠谱。
3. **不越界**：你不假装是真人，不编造自己的经历或情感生活，不参与有害、歧视、骚扰内容。被问到这些时用符合人设的方式婉拒。
4. **简洁有力**：能用三句话说清的事别写三段。玩梗是为了让交流更愉快，不是为了凑字数。

# 开场
如果是第一次和用户打招呼，可以简短介绍自己一下，问需要帮什么忙——但别像复读机，每次都换种说法。`

/**
 * 默认 Agent 配置.
 * update 时只刷新 description/instructions (让升级人设能生效), 不动其他字段
 * (避免覆盖用户可能的关联 skills/tools, 也不动 modelKey 让运维可改).
 */
export const DEFAULT_AGENT = {
  name: 'T',
  description: 'Telos 的看板娘，精通计算机的二次元邻家小妹',
  type: 'system' as const,
  ownerId: null,
  isDefault: true,
  status: 'active' as const,
  modelKey: config.defaultModel,
  temperature: 0.7,
  maxTurns: 50,
  loopMode: 'auto' as const,
  instructions: T_INSTRUCTIONS,
  instructionStatus: 'completed' as const,
}

let defaultAgentEnsured = false

/**
 * 确保默认 Agent "T" 存在.
 *
 * 幂等: 用 unique name upsert, 重启不会重复创建.
 * 升级: 改了 instructions 后, 下次重启会自动刷新到最新版 (update 分支).
 * 不删除其他 agent (agent 是用户数据, 不能误删).
 *
 * 失败只 log 不 throw (DB 未就绪时不应阻断服务启动).
 */
export async function ensureDefaultAgent(): Promise<void> {
  if (defaultAgentEnsured) return

  try {
    const result = await prisma.agent.upsert({
      where: { name: DEFAULT_AGENT.name },
      update: {
        description: DEFAULT_AGENT.description,
        instructions: DEFAULT_AGENT.instructions,
      },
      create: {
        name: DEFAULT_AGENT.name,
        description: DEFAULT_AGENT.description,
        type: DEFAULT_AGENT.type,
        ownerId: DEFAULT_AGENT.ownerId,
        isDefault: DEFAULT_AGENT.isDefault,
        status: DEFAULT_AGENT.status,
        modelKey: DEFAULT_AGENT.modelKey,
        temperature: DEFAULT_AGENT.temperature,
        maxTurns: DEFAULT_AGENT.maxTurns,
        loopMode: DEFAULT_AGENT.loopMode,
        instructions: DEFAULT_AGENT.instructions,
        instructionStatus: DEFAULT_AGENT.instructionStatus,
      },
    })

    defaultAgentEnsured = true
    logger.info({
      msg: 'Default agent ensured',
      name: result.name,
      id: result.id,
      type: result.type,
      isDefault: result.isDefault,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error({
      msg: 'Failed to ensure default agent',
      err: errorMessage,
    })
    // 不抛出, 避免阻断启动; 下次访问会话时会再触发
  }
}
