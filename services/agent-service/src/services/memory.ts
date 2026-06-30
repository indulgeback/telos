import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from './db.js'
import { generateEmbedding } from './embedding.js'
import { config } from '../config/index.js'
import { logger } from '../config/logger.js'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from './gcloud.js'

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  const model = config.defaultModel || 'gpt-4o-mini'

  if (model.startsWith('gemini-') || model.startsWith('google/gemini-')) {
    const apiKey = getGcloudAccessToken()
    const baseURL = getGcloudOpenAIBaseUrl()
    return new OpenAI({
      apiKey,
      baseURL,
    })
  }

  if (openaiClient) return openaiClient

  const apiKey = config.openaiApiKey || config.shortapiApiKey
  const baseURL = config.openaiApiKey ? (config.openaiBaseUrl || undefined) : (config.shortapiBaseUrl || undefined)

  openaiClient = new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL,
  })

  return openaiClient
}


// 常用寒暄/无实际记忆召回需求的超短句过滤器
const CHIT_CHAT_PATTERNS = [
  /^(你好|您好|hello|hi|hey|在吗|在不在)$/i,
  /^(好的|收到|ok|okay|y|n|no|yes|嗯|哦|哈|哈哈|哈哈哈|行|好吧)$/,
  /^(谢谢|谢谢你|感谢|thx|thanks)$/i,
  /^(再见|拜拜|bye|goodbye)$/i
]

// 显式长期记忆引用关键词
const EXPLICIT_RECALL_PATTERNS = [
  /上次/, /之前/, /你还记得/, /我之前/, /继续/, /接着/, /刚才/, /前面/,
  /那个/, /和之前一样/, /记得/
]

export function decideMemoryRecall(query: string, turnIndex: number): { shouldRecall: boolean; reason: string } {
  const trimmed = query.trim()
  if (!trimmed) {
    return { shouldRecall: false, reason: 'empty_query' }
  }

  // 1. 首轮强制触发：预热和捕获背景人设
  if (turnIndex <= 2) {
    return { shouldRecall: true, reason: 'first_turn_force' }
  }

  // 2. 长文本强制触发
  if (trimmed.length > 100) {
    return { shouldRecall: true, reason: 'complex_query_force' }
  }

  // 3. 显式回忆相关词强触发
  for (const pattern of EXPLICIT_RECALL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { shouldRecall: true, reason: 'explicit_keyword' }
    }
  }

  // 4. 过滤寒暄与超短无语义输入
  if (trimmed.length < 5) {
    for (const pattern of CHIT_CHAT_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { shouldRecall: false, reason: 'chit_chat_filter' }
      }
    }
  }

  // 5. 默认策略：其余情况执行召回
  return { shouldRecall: true, reason: 'default_recall' }
}

function segmentChinese(text: string): string[] {
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').trim()
  const blocks = cleaned.split(/\s+/)
  const tokens: string[] = []

  const stopwords = new Set([
    '用户', '喜欢', '需要', '想要', '觉得', '喜欢吃', '喜欢喝', '最喜欢', '也是', 
    '常常', '总是', '我们', '你们', '他们', '这个', '那个', '这些', '那些', '非常', 
    '特别', '比较', '感觉', '可以', '可能', '应该', '已经', '自己', '什么', '因为', 
    '所以', '如果', '但是', '然后'
  ])

  for (const block of blocks) {
    if (/^[a-zA-Z0-9]+$/.test(block)) {
      if (block.length >= 2) {
        tokens.push(block.toLowerCase())
      }
    } else {
      // 中文滑动分词
      for (let i = 0; i < block.length - 1; i++) {
        const bi = block.slice(i, i + 2)
        if (bi.length === 2 && !stopwords.has(bi)) {
          tokens.push(bi)
        }
        if (i < block.length - 2) {
          const tri = block.slice(i, i + 3)
          if (tri.length === 3 && !stopwords.has(tri)) {
            tokens.push(tri)
          }
        }
      }
    }
  }
  return Array.from(new Set(tokens))
}

/**
 * 检索关联该 Agent 和该用户的相似长期记忆
 * 升级为向量检索（Dense）与文本模糊检索（Sparse）的双通路检索系统，并通过 RRF (倒数排名融合) 机制融合，并应用时间衰减打分。
 */
export async function retrieveMemories(
  agentId: string,
  ownerId: string | null | undefined,
  query: string,
  limit: number = 5,
  categories?: string[],
  turnIndex: number = 99
): Promise<string[]> {
  if (!ownerId || !query || query.trim() === '') {
    return []
  }

  const calculateElasticDecay = (category: string, deltaDays: number): number => {
    let lambda = 0.005 // 默认 138 天半衰期
    let minDecay = 0.5 // 默认保底

    if (category === 'persona') {
      lambda = 0.0 // 人设与偏好永不衰减
      minDecay = 1.0
    } else if (category === 'temporary_context') {
      lambda = 0.23 // 临时状态快速衰减（半衰期约 3 天）
      minDecay = 0.1
    }

    return minDecay + (1 - minDecay) * Math.exp(-lambda * deltaDays)
  }

  // 触发决策器逻辑
  const decision = decideMemoryRecall(query, turnIndex)
  if (!decision.shouldRecall) {
    logger.info({
      msg: `\x1b[1;33m[Memory Retrieval] Skipped recall (Reason: ${decision.reason})\x1b[0m`,
      agentId,
      ownerId,
      query
    })
    return []
  }

  try {
    // ----------------------------------------------------
    // 1. 向量通路 (Dense Path)
    // ----------------------------------------------------
    let vectorResults: Array<{ content: string; category: string; distance: number; updatedAt: Date }> = []

    try {
      const embedding = await generateEmbedding(query)
      const vectorStr = `[${embedding.join(',')}]`

      // 构建分类过滤 SQL 子句
      let categoryFilterSql = ''
      const sqlParams: any[] = [agentId, ownerId, vectorStr]
      
      if (categories && categories.length > 0) {
        const placeHolders = categories.map((_, i) => `$${4 + i}`).join(',')
        categoryFilterSql = `AND category IN (${placeHolders})`
        sqlParams.push(...categories)
      }

      // 向量查询扩大召回至 15 条
      const vectorLimitIndex = sqlParams.length + 1
      const vectorQuery = `
        SELECT content, category, updated_at as "updatedAt", embedding <=> $3::vector AS distance
        FROM agent_memories
        WHERE agent_id = $1 AND owner_id = $2 AND embedding IS NOT NULL ${categoryFilterSql}
        ORDER BY embedding <=> $3::vector ASC
        LIMIT $${vectorLimitIndex}
      `
      vectorResults = await prisma.$queryRawUnsafe<Array<{ content: string; category: string; distance: number; updatedAt: Date }>>(
        vectorQuery,
        ...sqlParams,
        15
      )
    } catch (embeddingError) {
      logger.warn({
        msg: '\x1b[1;33m[Memory Retrieval] Failed to generate embedding, falling back to text search\x1b[0m',
        error: embeddingError,
        agentId,
        ownerId,
        query
      })
    }


    // 应用时间弹性衰减算法
    const now = Date.now()
    const vectorRanked = vectorResults.map(item => {
      const similarity = 1 - item.distance
      const updatedAt = new Date(item.updatedAt)
      const deltaDays = (now - updatedAt.getTime()) / (1000 * 3600 * 24)
      const decayFactor = calculateElasticDecay(item.category, deltaDays)
      const score = similarity * decayFactor
      return { content: item.content, score }
    })
    
    // 排序并过滤无关记忆 (得分为负或相似度太低的)
    const vectorRankedFiltered = vectorRanked
      .filter(item => item.score > 0.4)
      .sort((a, b) => b.score - a.score)

    // ----------------------------------------------------
    // 2. 文本通路 (Sparse Path)
    // ----------------------------------------------------
    // 使用 N-gram 滑动分词器提取中文多关键字，修复无标点长句检索退化问题
    const keywords = segmentChinese(query)

    let textResults: Array<{ content: string; category: string; updatedAt: Date }> = []

    if (keywords.length > 0) {
      const textSqlParams: any[] = [agentId, ownerId]
      const filterConditions: string[] = []
      
      keywords.forEach((keyword, i) => {
        textSqlParams.push(`%${keyword}%`)
        filterConditions.push(`content ILIKE $${3 + i}`)
      })

      let textCategoryFilterSql = ''
      if (categories && categories.length > 0) {
        const placeHolders = categories.map((_, i) => `$${3 + keywords.length + i}`).join(',')
        textCategoryFilterSql = `AND category IN (${placeHolders})`
        textSqlParams.push(...categories)
      }

      const textLimitIndex = textSqlParams.length + 1
      const textQuery = `
        SELECT content, category, updated_at as "updatedAt"
        FROM agent_memories
        WHERE agent_id = $1 AND owner_id = $2 ${textCategoryFilterSql}
          AND (${filterConditions.join(' OR ')})
        LIMIT $${textLimitIndex}
      `
      textResults = await prisma.$queryRawUnsafe<Array<{ content: string; category: string; updatedAt: Date }>>(
        textQuery,
        ...textSqlParams,
        15
      )
    }

    // 文本路时间衰减（相似度分值基准为 1.0）
    const textRankedFiltered = textResults.map(item => {
      const updatedAt = new Date(item.updatedAt)
      const deltaDays = (now - updatedAt.getTime()) / (1000 * 3600 * 24)
      const decayFactor = calculateElasticDecay(item.category, deltaDays)
      const score = 1.0 * decayFactor // 文本关键字完全命中的高度相关性
      return { content: item.content, score }
    }).sort((a, b) => b.score - a.score)

    // ----------------------------------------------------
    // 3. RRF (Reciprocal Rank Fusion) 双路排名融合
    // ----------------------------------------------------
    const rrfScores = new Map<string, number>()
    
    // 融合向量路排名
    vectorRankedFiltered.forEach((item, index) => {
      const rank = index + 1
      const rrfScore = 1 / (60 + rank)
      rrfScores.set(item.content, (rrfScores.get(item.content) || 0) + rrfScore)
    })

    // 融合文本路排名
    textRankedFiltered.forEach((item, index) => {
      const rank = index + 1
      const rrfScore = 1 / (60 + rank)
      rrfScores.set(item.content, (rrfScores.get(item.content) || 0) + rrfScore)
    })

    // 按合并打分降序排列
    const sortedFinal = Array.from(rrfScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0])

    logger.debug({
      msg: '\x1b[1;33m[Memory Retrieval] Long-term memories retrieved\x1b[0m',
      agentId,
      ownerId,
      query,
      keywords,
      vectorHits: vectorRankedFiltered.length,
      textHits: textRankedFiltered.length,
      finalReturned: sortedFinal.length,
    })

    return sortedFinal
  } catch (error) {
    logger.error({ msg: '\x1b[1;33m[Memory Retrieval] Failed to retrieve long-term memories\x1b[0m', error, agentId, ownerId, query })
    return []
  }
}

/**
 * 后台异步提取并合成用户的长期事实与偏好，分类存入向量数据库中
 */
export async function extractAndSynthesizeMemories(
  agentId: string,
  ownerId: string | null | undefined,
  chatHistory: any[]
): Promise<void> {
  if (!ownerId || !chatHistory || chatHistory.length === 0) {
    return
  }

  // 异步在后台运行，不阻塞主线程
  setTimeout(async () => {
    try {
      logger.info({ msg: '\x1b[1;33m[Memory Extraction] Starting background long-term memory extraction...\x1b[0m', agentId, ownerId })
      
      const client = getOpenAIClient()
      const chatHistoryText = chatHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n')

      const systemPrompt = `你是一个高效的记忆提取与分类助手。
下面是用户（user）与 AI 助手（assistant）之间的最新对话历史。
请提取出关于用户的长期事实、偏好、习惯或背景信息，以便在未来的会话中更好地服务用户。

要求：
1. 仅提取“陈述性事实”（如“用户擅长使用 TypeScript”、“用户更倾向于简洁的代码风格”），不要记录临时性的、单次会话中的闲聊或问候。
2. 每条事实应当是一句完整、独立的中文陈述，不含代词模糊性（用“用户”代替“你/我/他”）。
3. 提取结果必须进行分类。提取出的事实仅能归入以下三种类别之一：
   - "preference"：用户的偏好、习惯、特定指示与特殊要求。
   - "background"：用户的客观背景信息（工作、技术栈、常住城市等）。
   - "general"：其他通用的陈述性事实。
4. 提取的结果应当是一个 JSON 数组，其中每个元素是一个包含 "fact" (事实) 和 "category" (类别) 的 JSON 对象，例如：
   [
     { "fact": "用户常用技术栈是 React 和 Next.js", "category": "background" },
     { "fact": "用户要求回复尽量简洁，不带废话", "category": "preference" }
   ]
   如果没有任何有价值 of 长期事实需要记录，请直接返回空数组 []。
5. 绝对不要返回任何 Markdown 标记或除该 JSON 数组外的任何额外文字。`

      const response = await client.chat.completions.create({
        model: config.defaultModel || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `对话历史：\n${chatHistoryText}` }
        ],
        temperature: 0.1,
      })

      const rawText = response.choices?.[0]?.message?.content || ''
      
      // 清除多余的 markdown 格式包裹
      let cleanJson = rawText.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7)
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3)
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3)
      }
      cleanJson = cleanJson.trim()

      let facts: Array<{ fact: string; category: string }> = []
      try {
        facts = JSON.parse(cleanJson)
      } catch (e) {
        logger.warn({ msg: '\x1b[1;33m[Memory Extraction] Failed to parse extracted memories JSON\x1b[0m', rawText, error: e })
        return
      }

      if (!Array.isArray(facts) || facts.length === 0) {
        logger.info({ msg: '\x1b[1;33m[Memory Extraction] No new long-term memories extracted.\x1b[0m', agentId, ownerId })
        return
      }

      for (const item of facts) {
        if (!item || typeof item !== 'object' || typeof item.fact !== 'string' || !item.fact.trim()) continue
        const fact = item.fact.trim()
        
        let category = item.category || 'general'
        if (category !== 'preference' && category !== 'background' && category !== 'general') {
          category = 'general'
        }
        
        const embedding = await generateEmbedding(fact)
        const vectorStr = `[${embedding.join(',')}]`

        // 检查数据库中是否已存在几乎完全相同的记忆 (距离极小，例如 < 0.15)
        const existing = await prisma.$queryRawUnsafe<Array<{ id: string; distance: number }>>(
          `SELECT id, embedding <=> $3::vector AS distance
           FROM agent_memories
           WHERE agent_id = $1 AND owner_id = $2 AND embedding IS NOT NULL
           ORDER BY embedding <=> $3::vector ASC
           LIMIT 1`,
          agentId,
          ownerId,
          vectorStr
        )

        if (existing.length > 0 && existing[0].distance < 0.15) {
          // 已经存在极相似的事实陈述，更新 updatedAt 和 category 即可
          await prisma.agentMemory.update({
            where: { id: existing[0].id },
            data: { 
              updatedAt: new Date(),
              category
            }
          })
          logger.debug({ msg: '\x1b[1;33m[Memory Extraction] Memory fact already exists, updated updatedAt\x1b[0m', fact, distance: existing[0].distance })
        } else {
          // 新增一条向量记忆
          const memoryId = uuidv4()
          await prisma.$executeRawUnsafe(
            `INSERT INTO agent_memories (id, agent_id, owner_id, content, category, embedding, created_at, updated_at, metadata)
             VALUES ($1, $2, $3, $4, $5, $6::vector, NOW(), NOW(), '{}'::jsonb)`,
            memoryId,
            agentId,
            ownerId,
            fact,
            category,
            vectorStr
          )
          logger.info({ msg: '\x1b[1;33m[Memory Extraction] Stored new long-term memory fact\x1b[0m', fact, category })
        }
      }
    } catch (err) {
      logger.error({ msg: '\x1b[1;33m[Memory Extraction] Failed to run background memory extraction\x1b[0m', error: err, agentId, ownerId })
    }
  }, 0)
}
