import { tool } from '@openai/agents'
import { z } from 'zod'

/**
 * 澄清问题结构
 */
export interface ClarifyQuestion {
  question: string
  options: string[]
}

/**
 * 构造 clarify_question 工具。
 *
 * 该工具配合 Agent 的 toolUseBehavior: { stopAtToolNames: ['clarify_question'] } 使用。
 * 模型如果发现用户意图不明显、缺少必要参数、存在多条路径等情况时，调用此工具提问。
 * 调用后，Agent 将立即挂起运行，并将问题与可选项传递给前端展示。
 *
 * @param onClarifyCreated 当模型产生澄清问题时的回调（用于在运行时缓存记录）
 */
export function buildClarifyQuestionTool(
  onClarifyCreated?: (clarify: ClarifyQuestion) => void
) {
  return tool({
    name: 'clarify_question',
    description:
      '向用户提出澄清问题并提供可选的回答选项。当你发现用户的指令模糊不清、缺少关键参数或存在多种可选方案需要用户决策时，调用此工具。' +
      '调用此工具后，运行网络将会立即停止，等待用户做出选择。用户的选择将作为新一轮对话的输入返回给你。',
    parameters: z.object({
      question: z.string().describe('需要用户澄清的具体问题内容（如“你需要我生成什么语言的脚本？”）'),
      options: z
        .array(z.string())
        .describe('供用户选择的多个答案可选项列表（如 ["JavaScript", "Python", "Go"]）'),
    }),
    strict: true,
    async execute(input: any) {
      const question = typeof input.question === 'string' ? input.question.trim() : ''
      const options = Array.isArray(input.options)
        ? input.options.map((opt: any) => String(opt).trim()).filter(Boolean)
        : []

      if (!question) {
        throw new Error('澄清问题内容不能为空')
      }
      if (options.length === 0) {
        throw new Error('澄清选项列表不能为空')
      }

      const clarifyObj: ClarifyQuestion = { question, options }
      onClarifyCreated?.(clarifyObj)

      return JSON.stringify({
        clarify_created: true,
        question,
        options,
        message: '澄清问题已创建，正在等待用户选择。',
      })
    },
  } as any)
}
