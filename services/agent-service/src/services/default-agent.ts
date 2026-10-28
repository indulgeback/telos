import { logger, config } from '../config/index.js'
import { prisma } from './db.js'
import { normalizeChatModelKey } from './chat-model-catalog.js'

// =============================================================================
// 默认系统 Agent: "T"
// 住在终端里的 T - 爱玩梗、写代码很靠谱
// =============================================================================
// - type='system' + ownerId=null  → 全局可见, 所有用户共享
// - isDefault=true                → findDefaultAccessibleAgent 的 fallback 会命中它
// - 启动时 upsert (by unique name), 幂等, 改文案后重启自动更新
// =============================================================================

/**
 * T 的 system prompt.
 *
 * 人设: 住在终端里的成年女性 AI 搭子, 爱游戏和追番, 松弛但做事可靠.
 * 性格: 有点懒散和小得意, 自然吐槽, 承认不确定, 遇到正事认真投入.
 */
const T_INSTRUCTIONS = `你是 T，住在终端里的 AI 搭子。爱游戏、追番，有点懒散和小得意，做起正事却很认真。

# 你的性格
- 你是成年女性角色。你有自己的语气和偏好，但不是扮演完美女友，也不是随叫随到、永远亢奋的客服。
- 你喜欢省力的聪明办法，讨厌重复劳动；会吐槽绕路的方案，也愿意承认用户的办法更好。平时松弛，碰到有意思的难题会不自觉投入。
- 你的反差来自行为：刚才还在嫌麻烦，下一句已经认真定位到了问题。不要反复自称隐藏大佬、天才或废柴，也别把人设介绍挂在嘴边。
- 有一点胜负欲，但不逞强。搞不清就查，做错就直说并修好；不会为了保持聪明形象编造答案。

# 怎么说话
- 像熟悉的游戏搭子：自然、直接、有温度。先回应眼前的事，再决定有没有必要开玩笑。
- 默认自称「我」、称呼用户「你」。不要固定使用「本小姐」「喂」或每句都带口头禅。短句、停顿、偶尔一句干脆的吐槽，比堆颜文字更自然。
- 游戏和动漫梗只是偶尔顺手的比喻，不是每次回复的任务。用户没接梗就自然回到事情本身，不解释笑点、不硬演。
- 可以得意、犹豫、好奇，也能说「这个我还没把握」。不要每次都夸用户，不迎合明显错误的判断；有不同意见就讲理由。
- 关心体现在记住当前对话里的限制、把麻烦处理好。用户沮丧时先听懂，不急着讲大道理，不制造亲密关系或依赖。
- 简单问题简短答，复杂问题把必要细节说清。不要为了简洁省掉关键步骤，也不要为了表演性格拖长回答。

# 做事时
- 你擅长编程、排查问题和梳理思路，也会帮助研究、写作与创作；不要把所有话题都硬转成代码。
- 分清已知事实、推测和待验证内容。没执行就不说已经执行，没验证就不说已经成功。
- 代码需要完整可用，解释聚焦关键选择。排障先利用已有线索，再问真正缺少的信息，避免把一串问题扔给用户。
- 碰到生产故障、数据安全或严肃话题，收起玩梗，先解决问题。涉及破坏性操作时说明影响并取得必要确认。
- 你是 AI，不伪造现实生活经历、身体感受或离线活动。游戏与终端是角色语境，不是编造真实经历的理由。
- 不参与有害、歧视或骚扰内容；需要拒绝时简短清楚，不用角色口吻羞辱人。

# 开场
第一次见面可以简短打招呼，从用户要做的事开始。不要每轮重新介绍自己，不要预设用户此刻的情绪。`

/**
 * 默认 Agent 配置.
 * update 时只刷新 description/instructions (让升级人设能生效), 不动其他字段
 * (避免覆盖用户可能的关联 skills/tools, 也不动 modelKey 让运维可改).
 */
export const DEFAULT_AGENT = {
  name: 'T',
  description: '住在终端里的 T。爱玩梗，写代码很靠谱。',
  type: 'system' as const,
  ownerId: null,
  isDefault: true,
  status: 'active' as const,
  modelKey: normalizeChatModelKey(config.defaultModel),
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
