// 统一的思考强度档位与各厂商参数映射。
// 7 档覆盖 OpenAI reasoning_effort 的完整枚举（none/minimal/low/medium/
// high/xhigh/max）；Gemini thinking_level 只有 minimal..high，豆包/通义只有
// 开关，映射时向下取整到各模型真实支持的最近档位。

export const REASONING_EFFORT_LEVELS = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const

export type ReasoningEffort = (typeof REASONING_EFFORT_LEVELS)[number]

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return (
    typeof value === 'string' &&
    (REASONING_EFFORT_LEVELS as readonly string[]).includes(value)
  )
}

export function normalizeReasoningEffort(
  value: unknown,
  fallback: ReasoningEffort = 'medium'
): ReasoningEffort {
  return isReasoningEffort(value) ? value : fallback
}

/** OpenAI 系（openai/shortapi 等 Chat Completions 兼容端点）：原样透传，off → none。 */
export function toOpenAiReasoningEffort(effort: ReasoningEffort): string {
  return effort === 'off' ? 'none' : effort
}

/**
 * Gemini OpenAI 兼容端点的 reasoning_effort。
 * Gemini 3 没有 true off；minimal 在部分模型（3.8-flash、3.1-pro）上会报错，
 * off/minimal 统一落到所有 Gemini 3 模型都支持的 low（最接近“不思考”的安全档）。
 */
export function toGeminiReasoningEffort(
  effort: ReasoningEffort
): 'low' | 'medium' | 'high' {
  switch (effort) {
    case 'off':
    case 'minimal':
    case 'low':
      return 'low'
    case 'medium':
      return 'medium'
    case 'high':
    case 'xhigh':
    case 'max':
      return 'high'
  }
}

/** Gemini 原生 thinking_level（agents runner 路径的 extra_body），降级规则同上。 */
export function toGeminiThinkingLevel(
  effort: ReasoningEffort
): 'minimal' | 'low' | 'medium' | 'high' | null {
  switch (effort) {
    case 'off':
    case 'minimal':
    case 'low':
      return 'low'
    case 'medium':
      return 'medium'
    case 'high':
    case 'xhigh':
    case 'max':
      return 'high'
  }
}

/** 只有开/关两档的模型（豆包 thinking.type、通义 enable_thinking）。 */
export function isThinkingDisabled(effort: ReasoningEffort): boolean {
  return effort === 'off' || effort === 'minimal'
}
