'use client'
import { useRealtimeVoice } from './use-realtime-voice'

import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  AgentThreadSidebar,
  ChatContainer,
  type Message,
} from '@/components/organisms'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms'
import { PlanPanel } from '@/components/molecules/chat/PlanPanel'
import { ClarifyPanel } from '@/components/molecules/chat/ClarifyPanel'
import { SkillTrigger } from '@/components/molecules/chat/SkillTrigger'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { uploadImageToCos } from '@/lib/cos-upload'
import { API_BASE_URL } from '@/service/request'
import {
  agentService,
  type Agent,
  type AgentMessage,
  type AgentRun,
  type AgentRunApproval,
  type ClarifyPart,
} from '@/service/agent'
import { MessageSquare, Mic2 } from 'lucide-react'
import { RealtimeVoiceControl } from '@/components/molecules/chat/realtime-voice-control'
import type { VoiceAuraState } from '@/components/molecules/chat/VoiceAuraOrb'
import { toast } from 'sonner'
import { getLatestRetryTarget, replaceLatestAssistant } from './chat-retry'
import { resolveMessageModelLabel } from './chat-model-label'

const AUTO_SCROLL_THRESHOLD_PX = 120
const IMAGE_PLACEHOLDER_PROMPT = 'Please describe this image'
const MAX_IMAGE_ATTACHMENTS = 3

import {
  AgentRunDataPart,
  AgentStreamChunk,
  ChatStatus,
  ChatUiMessage,
  ContentPartItem,
  ReasoningEffort,
  RealtimeConfig,
  RealtimeMicState,
  RunStreamEnd,
  RunStreamResult,
  ToolCallItem,
  createLiveTranscriptMarker,
  createReasoningPart,
  createTextPart,
  createToolPart,
  formatElapsedSeconds,
  getDisplayMessageContent,
  getDisplayThreadTitle,
  getTextFromParts,
  hasLiveTranscriptMarker,
  hasTextContent,
  isRenderableMessage,
  isTextPart,
  isVoicePlaceholder,
  messageToUiMessage,
  supportsVision,
} from './chat-types'
import {
  extractRunApprovals,
  formatApprovalArguments,
  formatApprovalExpiry,
  parseClarifyPart,
  parseClientPlanSteps,
  parsePlanPart,
  parseReasoningPart,
  parseToolCallPart,
  parseUiMessageStreamChunk,
  extractAssistantContentParts,
  extractLegacyContent,
  isHiddenTool,
  pushTaggedTextParts,
} from './chat-plan-utils'
import {
  base64ToArrayBuffer,
  createClientMessageId,
  downsampleToPcm16,
  extractImageUrlsFromMessageParts,
  fileToDataUrl,
  getRealtimeWebSocketUrl,
} from './chat-audio-utils'
import { consumeAgentRunStream } from './chat-run-stream'
import { useChatThreads } from './use-chat-threads'
import { useChatModels } from './use-chat-models'
import { useChatSuggestions } from './use-chat-suggestions'

export function ChatView() {
  const t = useTranslations('Chat')
  const { data: session } = authClient.useSession()

  // 计算用户头像和首字母
  const userAvatarUrl = session?.user?.image || null
  const userInitials = useMemo(() => {
    if (!session?.user?.name) return null
    return session?.user?.name
      .trim()
      .split(/\s+/) // 按一个或多个空白字符分割
      .filter(Boolean) // 移除空字符串
      .map(n => n[0]!) // 取首字母
      .slice(0, 2) // 最多取两个首字母
      .join('')
      .toUpperCase()
  }, [session?.user?.name])

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // SkillTrigger 控制器:$ 触发技能选择器的导航控制
  const skillTriggerControlsRef = useRef<{
    move: (direction: 'up' | 'down' | 'enter' | 'escape') => void
    isOpen: () => boolean
  } | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const isStreamingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const { modelOptions, selectedModel, setSelectedModel } = useChatModels()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)
  const [threadSearch, setThreadSearch] = useState('')
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>('medium')
  // plan 模式：'auto'=普通对话，'plan'=出计划模式
  const [planMode, setPlanMode] = useState<'auto' | 'plan'>('auto')
  // 待批准/执行中的计划：驱动输入框上方的 PlanPanel
  const [pendingPlan, setPendingPlan] = useState<{
    messageId: string
    uiMessageId: string
    summary: string
    steps: Array<{ description: string; tool_hint?: string }>
  } | null>(null)
  // 澄清问题属于 composer bottom pane，不属于聊天记录。
  const [pendingClarify, setPendingClarify] = useState<{
    messageId: string
    question: string
    options: string[]
  } | null>(null)
  // 计划的整体状态：pending(待批准) / approved(已批准执行中) / rejected(已放弃)
  const [planPanelStatus, setPlanPanelStatus] = useState<
    'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
  >('pending')
  // SkillTrigger：选中技能后回填输入框为 $skill-name(带空格让用户继续输入指令)
  const handleSkillPick = useCallback(
    (skillName: string) => {
      // 把当前输入中末尾的 $xxx 替换为 $skill-name + 空格
      const next = input.replace(/\$[a-z0-9-]*$/i, `$${skillName} `)
      setInput(next)
      textareaRef.current?.focus()
    },
    [input]
  )
  // SkillTrigger 键盘导航：拦截方向键/Enter/Escape
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = skillTriggerControlsRef.current
      if (!ctrl || !ctrl.isOpen()) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        ctrl.move('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        ctrl.move('down')
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        ctrl.move('enter')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setInput(input.replace(/\$[a-z0-9-]*$/i, ''))
      }
    }
    el.addEventListener('keydown', onKeyDown, true)
    return () => el.removeEventListener('keydown', onKeyDown, true)
  }, [input])
  // 每步的执行状态（execute 阶段实时更新）
  const [planStatuses, setPlanStatuses] = useState<
    Array<'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'>
  >([])

  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [assistantModelById, setAssistantModelById] = useState<
    Record<string, string>
  >({})
  const pendingReplyModelLabelRef = useRef('')
  const pendingImageBatchesRef = useRef<string[][]>([])
  const [imagesByMessageId, setImagesByMessageId] = useState<
    Record<string, string[]>
  >({})
  const [messages, setMessages] = useState<ChatUiMessage[]>([])
  // messages 的 ref 镜像，供 restore-run effect 读最新值而不必把 messages 放进依赖
  // （放进依赖会导致流式期间每个 chunk 都重跑 effect，引发重复订阅/双气泡）
  const messagesRef = useRef<ChatUiMessage[]>([])
  messagesRef.current = messages
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(
    null
  )
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeRunIdRef = useRef<string | null>(null)
  // 按 threadId 分桶的「本会话已订阅过的 runId」集合，防止同一 run 被当成新 run
  // 重复恢复（导致双气泡）。按会话隔离：切回旧会话时该会话的桶不受影响，仍可恢复
  // 其仍在跑的 run；同一会话内重复触发 restore 才会被去重。
  const processedRunIdsRef = useRef<Map<string, Set<string>>>(new Map())
  // 标记某 (threadId, runId) 已被订阅过；返回是否为重复（重复则调用方应跳过）
  const markRunProcessed = (threadId: string, runId: string): boolean => {
    const set = processedRunIdsRef.current.get(threadId) ?? new Set<string>()
    if (set.has(runId)) return true
    set.add(runId)
    processedRunIdsRef.current.set(threadId, set)
    return false
  }
  // 当前正在执行的计划所在的消息 id（execute 阶段的 plan_step_updated 需要它来定位计划气泡）
  const activePlanMessageIdRef = useRef<string | null>(null)
  const planActionBusyRef = useRef(false)
  // pendingPlan 的 ref（streamAgentMessage 的 finally 闭包需要同步读取最新值）
  const pendingPlanRef = useRef(pendingPlan)
  useEffect(() => {
    pendingPlanRef.current = pendingPlan
  }, [pendingPlan])
  // pendingClarify 的 ref：stream finally 需要同步读取最新等待态。
  const pendingClarifyRef = useRef(pendingClarify)
  useEffect(() => {
    pendingClarifyRef.current = pendingClarify
  }, [pendingClarify])
  // Tool approval pauses are durable; keep the run id in a ref so stream
  // cleanup cannot briefly switch the UI back to ready before React commits.
  const [pendingApprovalRunId, setPendingApprovalRunId] = useState<
    string | null
  >(null)
  const pendingApprovalRunIdRef = useRef<string | null>(null)
  const approvalAssistantIdRef = useRef<string | null>(null)
  const approvalResumeCursorRef = useRef('')
  const approvalExpiryTimerRef = useRef<number | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<AgentRunApproval[]>(
    []
  )
  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null)
  const isLoading =
    status === 'submitted' ||
    status === 'streaming' ||
    activeAssistantId !== null ||
    pendingApprovalRunId !== null
  // ?prompt= 自动发送:支持从其他页面跳转时预填并自动发送一条消息
  // (例如「创建技能」按钮跳转 /chat?prompt=$skill-creator ...)。
  // 用 ref 保证只触发一次,且需等待 selectedAgent 就绪(创建会话需要 agentId)。
  const searchParams = useSearchParams()
  const router = useRouter()
  const pendingPromptRef = useRef<string | null>(null)

  useEffect(() => {
    const prompt = searchParams.get('prompt')
    if (prompt) {
      pendingPromptRef.current = prompt
      // 消费后从 URL 移除 prompt,避免刷新/分享链接时重复发送
      const next = new URLSearchParams(searchParams.toString())
      next.delete('prompt')
      const rest = next.toString()
      router.replace(rest ? `/chat?${rest}` : '/chat')
    }
    // 仅在挂载时读取一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restoreThreadMessages = useCallback(
    (storedMessages: AgentMessage[]) => {
      const visibleMessages = storedMessages.filter(
        message => message.role === 'user' || message.role === 'assistant'
      )
      setMessages(visibleMessages.map(messageToUiMessage) as any)
      const restoredPlan = [...visibleMessages]
        .reverse()
        .flatMap(message => {
          if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
            return []
          }
          const plan = message.parts
            .map(parsePlanPart)
            .find((value): value is NonNullable<typeof value> => Boolean(value))
          return plan ? [{ message, plan }] : []
        })
        .find(({ plan }) =>
          ['pending', 'approved', 'executing'].includes(plan.status)
        )
      if (restoredPlan) {
        const restored = {
          messageId: restoredPlan.message.id,
          uiMessageId: restoredPlan.message.id,
          summary: restoredPlan.plan.summary ?? '',
          steps: restoredPlan.plan.steps,
        }
        pendingPlanRef.current = restored
        setPendingPlan(restored)
        setPlanPanelStatus(restoredPlan.plan.status)
        setPlanStatuses(restoredPlan.plan.stepStatuses ?? [])
      } else {
        pendingPlanRef.current = null
        setPendingPlan(null)
        setPlanPanelStatus('pending')
        setPlanStatuses([])
      }
      const restoredClarification = [...visibleMessages]
        .reverse()
        .flatMap(message => {
          if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
            return []
          }
          const clarify = message.parts
            .map(parseClarifyPart)
            .find((value): value is NonNullable<typeof value> =>
              Boolean(value && value.status === 'pending')
            )
          return clarify ? [{ message, clarify }] : []
        })[0]
      if (restoredClarification) {
        const restored = {
          messageId:
            restoredClarification.clarify.messageId ||
            restoredClarification.message.id,
          question: restoredClarification.clarify.question,
          options: restoredClarification.clarify.options,
        }
        pendingClarifyRef.current = restored
        setPendingClarify(restored)
      } else {
        pendingClarifyRef.current = null
        setPendingClarify(null)
      }
      pendingImageBatchesRef.current = []
      setImagesByMessageId({})
      setAssistantModelById({})
    },
    [setMessages]
  )

  const clearThreadHistory = useCallback(() => {
    setMessages([])
    pendingClarifyRef.current = null
    setPendingClarify(null)
  }, [])
  const voiceThreadTitle = useCallback(
    (title?: string | null) => getDisplayThreadTitle(title, t('voiceChat')),
    [t]
  )
  const chatThreads = useChatThreads({
    agentId: selectedAgent?.id,
    isLoading,
    voiceTitle: voiceThreadTitle,
    onRestoreMessages: restoreThreadMessages,
    onClearAgent: clearThreadHistory,
    onCurrentThreadDeleted: clearThreadHistory,
  })
  const {
    threads,
    setThreads,
    currentThreadId,
    setCurrentThreadId,
    currentThreadIdRef,
    threadsLoading,
    threadToRename,
    setThreadToRename,
    renameThreadTitle,
    setRenameThreadTitle,
    isRenamingThread,
    threadToDelete,
    setThreadToDelete,
    isDeletingThread,
    loadThreads,
    loadThreadMessages,
    selectThread,
    beginRenameThread,
    confirmRenameThread,
    beginDeleteThread,
    confirmDeleteThread,
    invalidateRequests,
  } = chatThreads

  useEffect(() => {
    void loadThreads({ selectLatest: true })
  }, [loadThreads])

  const updateAssistantParts = useCallback(
    (
      assistantId: string,
      updater: (parts: Array<Record<string, unknown>>) => void
    ) => {
      setMessages(prev =>
        prev.map(message => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message
          }

          const parts = Array.isArray(message.parts)
            ? (message.parts.map(part =>
                part && typeof part === 'object'
                  ? { ...(part as Record<string, unknown>) }
                  : part
              ) as Array<Record<string, unknown>>)
            : []
          updater(parts)

          return {
            ...message,
            parts,
            content: getTextFromParts(parts),
          }
        })
      )
    },
    []
  )

  const restoreAssistantSnapshot = useCallback(
    (
      assistantId: string,
      run: Pick<AgentRun, 'partial_output' | 'partial_parts'>
    ) => {
      const storedParts = Array.isArray(run.partial_parts)
        ? run.partial_parts
        : []
      const partialOutput =
        typeof run.partial_output === 'string' ? run.partial_output : ''
      if (storedParts.length === 0 && !partialOutput) return
      const parts = storedParts.length
        ? storedParts
        : [createTextPart(partialOutput)]
      setMessages(prev =>
        prev.map(message => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message
          }
          return {
            ...message,
            parts,
            content: getTextFromParts(parts) || partialOutput,
          }
        })
      )
    },
    [setMessages]
  )

  const applyAgentStreamChunk = useCallback(
    (assistantId: string, chunk: AgentStreamChunk) => {
      if (chunk.type === 'data-agent-run' && chunk.data?.threadId) {
        const shouldRefreshThreads =
          currentThreadIdRef.current !== chunk.data.threadId
        currentThreadIdRef.current = chunk.data.threadId
        setCurrentThreadId(chunk.data.threadId)
        if (shouldRefreshThreads) {
          void loadThreads()
        }
        return
      }

      if (chunk.type === 'agent.run.created' && chunk.data?.threadId) {
        const shouldRefreshThreads =
          currentThreadIdRef.current !== chunk.data.threadId
        currentThreadIdRef.current = chunk.data.threadId
        setCurrentThreadId(chunk.data.threadId)
        if (shouldRefreshThreads) {
          void loadThreads()
        }
        return
      }

      if (chunk.type === 'response.tool_approval.required') {
        const approvals = extractRunApprovals(chunk)
        if (approvals.length > 0) {
          approvalAssistantIdRef.current = assistantId
          setPendingApprovals(prev => {
            const next = [...prev]
            approvals.forEach(approval => {
              const index = next.findIndex(item => item.id === approval.id)
              if (index === -1) next.push(approval)
              else next[index] = { ...next[index], ...approval }
            })
            return next
          })
        }
        return
      }

      // plan 模式：后端产出了结构化计划，设置 pendingPlan state（驱动输入框上方的 PlanPanel）
      if (chunk.type === 'response.plan_proposed') {
        const planSummary =
          typeof chunk.plan_summary === 'string' ? chunk.plan_summary : ''
        const planSteps = Array.isArray(chunk.plan_steps)
          ? chunk.plan_steps.filter(
              (s): s is { description: string; tool_hint?: string } =>
                !!s &&
                typeof s === 'object' &&
                typeof s.description === 'string'
            )
          : []
        if (planSteps.length > 0) {
          // 同步设 ref，确保 streamAgentMessage 的 finally 能立即读到最新值
          pendingPlanRef.current = {
            messageId:
              typeof chunk.plan_message_id === 'string' && chunk.plan_message_id
                ? chunk.plan_message_id
                : assistantId,
            uiMessageId: assistantId,
            summary: planSummary,
            steps: planSteps,
          }
          setPendingPlan(pendingPlanRef.current)
          setPlanPanelStatus('pending')
          setPlanStatuses([])
          setPlanMode('auto')
        }
        return
      }

      if (chunk.type === 'response.plan_state_updated') {
        if (
          chunk.plan_status === 'executing' ||
          chunk.plan_status === 'completed' ||
          chunk.plan_status === 'failed'
        ) {
          setPlanPanelStatus(chunk.plan_status)
        }
        if (Array.isArray(chunk.plan_step_statuses)) {
          setPlanStatuses(chunk.plan_step_statuses)
        }
        return
      }

      // execute 阶段：模型更新了某一步的状态，实时更新 PlanPanel
      if (chunk.type === 'response.plan_step_updated') {
        const stepIndex = Number(chunk.step_index)
        const stepStatus = chunk.plan_step_status
        if (!Number.isInteger(stepIndex) || !stepStatus) return
        // 同步更新 planStatuses state（PlanPanel 驱动）
        setPlanStatuses(prev => {
          const stepCount = pendingPlanRef.current?.steps.length ?? 0
          const next =
            prev && prev.length === stepCount
              ? [...prev]
              : Array.from({ length: stepCount }, () => 'pending' as const)
          if (stepIndex < next.length) {
            next[stepIndex] = stepStatus
          }
          return next
        })
        return
      }

      // clarify 模式：模型调用了 clarify_question，实时把澄清问题写入 parts，
      // 让 ClarifyPanel 在流式过程中即时渲染（而非等刷新历史才出现）
      if (chunk.type === 'response.clarify_created') {
        const question =
          typeof chunk.clarify_question === 'string'
            ? chunk.clarify_question
            : ''
        const options = Array.isArray(chunk.clarify_options)
          ? chunk.clarify_options.map(String)
          : []
        if (question && options.length > 0) {
          const clarifyMessageId =
            typeof chunk.clarify_message_id === 'string'
              ? chunk.clarify_message_id
              : assistantId
          // 同步设 ref，确保流结束后保持 submitted 状态（与 plan 一致）
          const clarification = {
            messageId: clarifyMessageId,
            question,
            options,
          }
          pendingClarifyRef.current = clarification
          setPendingClarify(clarification)
          updateAssistantParts(assistantId, parts => {
            // 模型可能在调用 clarify_question 前先输出过正文（如「请问你需要…」），
            // 这些 text delta 已被流式 append。命中 clarify 时后端落库为空正文，
            // 这里同步丢弃这些前置文本，使流式态与持久化态一致、避免刷新前后不一致。
            for (let i = parts.length - 1; i >= 0; i--) {
              if (isTextPart(parts[i])) parts.splice(i, 1)
            }
            // 避免重复 push（completed 后端可能重放）
            if (!parts.some(p => p.type === 'clarify')) {
              parts.push({
                type: 'clarify',
                clarify: {
                  messageId: clarifyMessageId,
                  question,
                  options,
                  status: 'pending',
                },
              } as any)
            }
          })
        }
        return
      }

      if (chunk.type === 'response.failed') {
        const errorText =
          typeof chunk.errorText === 'string'
            ? chunk.errorText
            : typeof chunk.error === 'string'
              ? chunk.error
              : chunk.error && typeof chunk.error === 'object'
                ? JSON.stringify(chunk.error)
                : 'Service failed'
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(t('chatError', { error: errorText })))
        })
        return
      }

      if (chunk.type === 'reasoning-start') {
        updateAssistantParts(assistantId, parts => {
          const streamId = `${chunk.id || 'reasoning'}-${parts.length}`
          parts.push({ ...createReasoningPart(), streamId })
        })
        return
      }

      if (
        (chunk.type === 'reasoning-delta' ||
          chunk.type === 'response.reasoning.delta') &&
        chunk.delta
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts[parts.length - 1] as any
          if (!part || part.type !== 'reasoning') {
            part = { ...createReasoningPart(), streamId: chunk.id }
            parts.push(part)
          }
          if (!part.reasoning) {
            part.reasoning = { text: '', state: 'streaming' }
          }
          part.reasoning.text = `${typeof part.reasoning.text === 'string' ? part.reasoning.text : ''}${
            chunk.delta
          }`
          part.reasoning.state = 'streaming'
        })
        return
      }

      if (
        chunk.type === 'reasoning-end' ||
        chunk.type === 'response.reasoning.done'
      ) {
        updateAssistantParts(assistantId, parts => {
          parts.forEach((part: any) => {
            if (part.type === 'reasoning') {
              if (!part.reasoning) {
                part.reasoning = { text: '', state: 'done' }
              } else {
                part.reasoning.state = 'done'
              }
            }
          })
        })
        return
      }

      if (
        chunk.type === 'text-start' ||
        chunk.type === 'response.output_text.start'
      ) {
        updateAssistantParts(assistantId, parts => {
          const streamId = `${chunk.id || 'text'}-${parts.length}`
          parts.push({ ...createTextPart(''), streamId })
        })
        return
      }

      if (
        (chunk.type === 'text-delta' ||
          chunk.type === 'response.output_text.delta') &&
        chunk.delta
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts[parts.length - 1]
          if (!part || part.type !== 'text') {
            part = { ...createTextPart(''), streamId: chunk.id }
            parts.push(part)
          }
          part.text = `${typeof part.text === 'string' ? part.text : ''}${
            chunk.delta
          }`
        })
        return
      }

      if (
        (chunk.type === 'tool-input-start' ||
          chunk.type === 'response.output_item.added') &&
        chunk.toolCallId
      ) {
        // clarify_question 等隐藏工具：不渲染 tool card（产物由 ClarifyPanel 承载）
        if (isHiddenTool(chunk.toolName)) return
        updateAssistantParts(assistantId, parts => {
          if (parts.some(part => part.toolCallId === chunk.toolCallId)) return
          parts.push(
            createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'input-streaming'
            )
          )
        })
        return
      }

      if (
        (chunk.type === 'tool-input-delta' ||
          chunk.type === 'response.function_call_arguments.delta') &&
        chunk.toolCallId
      ) {
        if (isHiddenTool(chunk.toolName)) return
        updateAssistantParts(assistantId, parts => {
          let part = parts.find(item => item.toolCallId === chunk.toolCallId)
          if (!part) {
            part = createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'input-streaming'
            )
            parts.push(part)
          }
          const prevInput =
            typeof part.input === 'string' && part.input.trim()
              ? part.input
              : ''
          part.input = `${prevInput}${chunk.inputTextDelta || ''}`
        })
        return
      }

      if (
        (chunk.type === 'tool-input-available' ||
          chunk.type === 'response.function_call_arguments.done') &&
        chunk.toolCallId
      ) {
        if (isHiddenTool(chunk.toolName)) return
        updateAssistantParts(assistantId, parts => {
          let part = parts.find(item => item.toolCallId === chunk.toolCallId)
          if (!part) {
            part = createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'input-available'
            )
            parts.push(part)
          }
          part.type = 'tool'
          part.toolName = chunk.toolName || part.toolName || 'tool'
          part.state = 'input-available'
          part.input = chunk.input
        })
        return
      }

      if (
        (chunk.type === 'tool-output-available' ||
          chunk.type === 'agent.tool_call.output') &&
        chunk.toolCallId
      ) {
        if (isHiddenTool(chunk.toolName)) return
        updateAssistantParts(assistantId, parts => {
          let part = parts.find(item => item.toolCallId === chunk.toolCallId)
          if (!part) {
            part = createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'output-available'
            )
            parts.push(part)
          }
          part.type = 'tool'
          part.toolName = chunk.toolName || part.toolName || 'tool'
          part.state = 'output-available'
          part.output = chunk.output
        })
      }
    },
    [
      currentThreadIdRef,
      loadThreads,
      setCurrentThreadId,
      t,
      updateAssistantParts,
    ]
  )

  const streamAgentMessage = useCallback(
    async (body: Record<string, unknown>, assistantId: string) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setStatus('submitted')
      setActiveAssistantId(assistantId)
      let runId: string | null = null

      try {
        const response = await fetch(`${API_BASE_URL}/api/agent`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Chat run failed: ${response.status}`)
        }
        const payload = (await response.json()) as {
          data?: { run_id?: string; thread_id?: string; status?: string }
        }
        runId = payload.data?.run_id || null
        const threadId = payload.data?.thread_id || null
        if (!runId) {
          throw new Error('Chat run response is missing run_id')
        }
        activeRunIdRef.current = runId
        if (currentThreadIdRef.current) {
          markRunProcessed(currentThreadIdRef.current, runId)
        }
        setMessages(prev =>
          prev.map(message =>
            message.id === assistantId ? { ...message, runId } : message
          )
        )
        if (threadId) {
          const shouldRefreshThreads = currentThreadIdRef.current !== threadId
          currentThreadIdRef.current = threadId
          setCurrentThreadId(threadId)
          if (shouldRefreshThreads) {
            void loadThreads()
          }
        }

        setStatus('streaming')
        const streamEnd = await consumeAgentRunStream(
          runId,
          controller.signal,
          chunk => applyAgentStreamChunk(assistantId, chunk)
        )
        if (streamEnd.end === 'awaiting_approval') {
          pendingApprovalRunIdRef.current = runId
          approvalAssistantIdRef.current = assistantId
          approvalResumeCursorRef.current = streamEnd.cursor
          setPendingApprovalRunId(runId)
          setStatus('submitted')
        }
        if (streamEnd.end === 'terminal') {
          approvalResumeCursorRef.current = ''
        }
        return streamEnd
      } catch (error) {
        console.error('Chat stream error:', error)
        if (error instanceof Error && error.name === 'AbortError') return
        const message = error instanceof Error ? error.message : String(error)
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(t('chatError', { error: message })))
        })
      } finally {
        abortControllerRef.current = null
        if (activeRunIdRef.current === runId) {
          activeRunIdRef.current = null
        }
        setActiveAssistantId(null)
        // plan 模式且计划正在等待审批时，保持 submitted（loading）状态，
        // 不让复制/重试按钮过早出现；clarify 同理（等待用户选择）
        if (pendingClarifyRef.current || pendingApprovalRunIdRef.current) {
          setStatus('submitted')
        } else {
          setStatus('ready')
        }
      }
    },
    [
      applyAgentStreamChunk,
      currentThreadIdRef,
      loadThreads,
      setCurrentThreadId,
      t,
      updateAssistantParts,
    ]
  )

  const subscribeExistingRun = useCallback(
    async (runId: string, assistantId: string) => {
      if (activeRunIdRef.current === runId) return
      if (currentThreadIdRef.current) {
        markRunProcessed(currentThreadIdRef.current, runId)
      }
      const controller = new AbortController()
      abortControllerRef.current = controller
      activeRunIdRef.current = runId
      setStatus('streaming')
      setActiveAssistantId(assistantId)

      try {
        const streamEnd = await consumeAgentRunStream(
          runId,
          controller.signal,
          chunk => applyAgentStreamChunk(assistantId, chunk),
          approvalResumeCursorRef.current
        )
        if (streamEnd.end === 'awaiting_approval') {
          pendingApprovalRunIdRef.current = runId
          approvalAssistantIdRef.current = assistantId
          approvalResumeCursorRef.current = streamEnd.cursor
          setPendingApprovalRunId(runId)
          setStatus('submitted')
        }
        if (streamEnd.end === 'terminal') {
          approvalResumeCursorRef.current = ''
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        const message = error instanceof Error ? error.message : String(error)
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(t('chatError', { error: message })))
        })
      } finally {
        abortControllerRef.current = null
        if (activeRunIdRef.current === runId) {
          activeRunIdRef.current = null
        }
        setActiveAssistantId(null)
        setStatus(
          pendingClarifyRef.current || pendingApprovalRunIdRef.current
            ? 'submitted'
            : 'ready'
        )
      }
    },
    [applyAgentStreamChunk, currentThreadIdRef, t, updateAssistantParts]
  )

  const resumeApprovalRun = useCallback(
    async (runId: string, assistantId: string | null) => {
      if (!approvalResumeCursorRef.current) {
        const eventData = await agentService.getRunEvents(runId)
        approvalResumeCursorRef.current =
          eventData.events.at(-1)?.sequence ?? ''
      }
      pendingApprovalRunIdRef.current = null
      approvalAssistantIdRef.current = null
      setPendingApprovalRunId(null)
      setPendingApprovals([])
      if (assistantId) {
        await subscribeExistingRun(runId, assistantId)
      } else {
        setStatus('ready')
      }
    },
    [subscribeExistingRun]
  )

  const refreshApprovalState = useCallback(
    async (runId: string, assistantId: string | null) => {
      const [run, approvals] = await Promise.all([
        agentService.getRun(runId),
        agentService.getRunApprovals(runId),
      ])
      if (run.status === 'awaiting_approval' && approvals.length > 0) {
        setPendingApprovals(
          approvals.map(approval => ({
            ...approval,
            status: approval.status ?? 'pending',
          }))
        )
        pendingApprovalRunIdRef.current = runId
        approvalAssistantIdRef.current = assistantId
        setPendingApprovalRunId(runId)
        setStatus('submitted')
        return
      }
      await resumeApprovalRun(runId, assistantId)
    },
    [resumeApprovalRun]
  )

  // The backend expires approvals independently. Refresh at the earliest
  // deadline so an open dialog cannot remain stuck after automatic resume.
  useEffect(() => {
    if (approvalExpiryTimerRef.current !== null) {
      window.clearTimeout(approvalExpiryTimerRef.current)
      approvalExpiryTimerRef.current = null
    }
    if (!pendingApprovalRunId || pendingApprovals.length === 0) return
    const deadlines = pendingApprovals
      .filter(item => !item.status || item.status === 'pending')
      .map(item => new Date(item.expires_at).getTime())
      .filter(Number.isFinite)
    if (deadlines.length === 0) return
    // Give the server-side expiry scanner time to commit before retrying; a
    // stale awaiting_approval read must not turn into a tight browser loop.
    const delay = Math.max(1_000, Math.min(...deadlines) - Date.now() + 100)
    const refreshAfterExpiry = () => {
      approvalExpiryTimerRef.current = null
      const runId = pendingApprovalRunIdRef.current
      const assistantId = approvalAssistantIdRef.current
      if (!runId) return
      void refreshApprovalState(runId, assistantId).catch(error => {
        console.warn('Failed to refresh expired approval', error)
        toast.error(t('approval.refreshFailed'))
        if (pendingApprovalRunIdRef.current === runId) {
          approvalExpiryTimerRef.current = window.setTimeout(
            refreshAfterExpiry,
            5_000
          )
        }
      })
    }
    approvalExpiryTimerRef.current = window.setTimeout(
      refreshAfterExpiry,
      delay
    )
    return () => {
      if (approvalExpiryTimerRef.current !== null) {
        window.clearTimeout(approvalExpiryTimerRef.current)
        approvalExpiryTimerRef.current = null
      }
    }
  }, [pendingApprovalRunId, pendingApprovals, refreshApprovalState, t])

  const handleApprovalDecision = useCallback(
    async (approval: AgentRunApproval, decision: 'approved' | 'denied') => {
      const runId = pendingApprovalRunIdRef.current
      if (!runId || approvalBusyId) return

      setApprovalBusyId(approval.id)
      try {
        await agentService.decideRunApproval(runId, approval.id, decision)
        await refreshApprovalState(runId, approvalAssistantIdRef.current)
      } catch (error) {
        console.error('Failed to decide run approval', error)
        const errorStatus =
          error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : undefined
        if (errorStatus === 409) {
          try {
            await refreshApprovalState(runId, approvalAssistantIdRef.current)
          } catch (refreshError) {
            console.warn('Failed to refresh approval conflict', refreshError)
          }
        }
        toast.error(t('approval.decideFailed'))
      } finally {
        setApprovalBusyId(null)
      }
    },
    [approvalBusyId, refreshApprovalState, t]
  )

  // restore-run：进入会话时恢复尚未结束的 run。
  // 注意：依赖里不放 messages——流式期间 messages 每个 chunk 都变，放进依赖会导致
  // 该 effect 反复重跑、反复 subscribeExistingRun，从而出现两个回复气泡。
  // 这里只依赖 currentThreadId（会话切换）和 subscribeExistingRun（稳定 ref）。
  useEffect(() => {
    if (!currentThreadId || activeRunIdRef.current) return

    let disposed = false
    const restoreRun = async () => {
      try {
        const runs = await agentService.listThreadRuns(currentThreadId)
        if (disposed || activeRunIdRef.current) return
        const resumableRun = runs.find(
          run =>
            run.status === 'queued' ||
            run.status === 'running' ||
            run.status === 'awaiting_approval'
        )
        if (!resumableRun) return
        // 本会话（按 threadId 隔离）已订阅过该 run，不再重复订阅；
        // 但切回旧会话时该会话的桶独立存在，仍可恢复其仍在跑的 run
        if (
          processedRunIdsRef.current.get(currentThreadId)?.has(resumableRun.id)
        ) {
          return
        }

        let assistantId =
          messagesRef.current.find(
            message =>
              message.role === 'assistant' && message.runId === resumableRun.id
          )?.id || ''
        if (!assistantId) {
          assistantId = createClientMessageId('assistant')
          setMessages(prev => [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              runId: resumableRun.id,
              content: '',
              parts: [],
            },
          ])
        }
        restoreAssistantSnapshot(assistantId, resumableRun)
        if (resumableRun.status === 'awaiting_approval') {
          const approvals = await agentService.getRunApprovals(resumableRun.id)
          if (disposed) return
          if (approvals.length === 0) {
            void subscribeExistingRun(resumableRun.id, assistantId)
            return
          }
          try {
            const eventData = await agentService.getRunEvents(resumableRun.id)
            approvalResumeCursorRef.current =
              eventData.events.at(-1)?.sequence ?? ''
          } catch (error) {
            // The approval list is authoritative for this view. A diagnostic
            // cursor is best effort; a later stream reconnect can still
            // deliver the durable approval event if the event read failed.
            console.warn('Failed to load approval stream cursor', error)
            approvalResumeCursorRef.current = ''
          }
          setPendingApprovals(
            approvals.map(approval => ({
              ...approval,
              status: approval.status ?? 'pending',
            }))
          )
          pendingApprovalRunIdRef.current = resumableRun.id
          approvalAssistantIdRef.current = assistantId
          setPendingApprovalRunId(resumableRun.id)
          setStatus('submitted')
          return
        }
        void subscribeExistingRun(resumableRun.id, assistantId)
      } catch (error) {
        console.error('Failed to restore running run', error)
      }
    }

    void restoreRun()
    return () => {
      disposed = true
    }
  }, [currentThreadId, restoreAssistantSnapshot, subscribeExistingRun])
  const {
    realtimeEnabled,
    setRealtimeEnabled,
    realtimeConfig,
    realtimeConfigLoading,
    realtimeMicState,
    realtimeElapsedSeconds,
    realtimeErrorText,
    realtimeVolumeAmplitude,
    realtimeMuted,
    setRealtimeMuted,
    realtimeAvailable,
    isRealtimeMicActive,
    streamRealtimeTextMessage,
  } = useRealtimeVoice({
    isLoading,
    selectedAgent,
    currentThreadIdRef,
    pendingReplyModelLabelRef,
    shouldAutoScrollRef,
    setShowScrollToBottom,
    setMessages,
    setActiveAssistantId,
    setStatus,
    abortControllerRef,
    pendingClarifyRef,
    applyAgentStreamChunk,
    updateAssistantParts,
  })

  const suggestionPrompts = useChatSuggestions(t)

  useEffect(() => {
    isStreamingRef.current = isLoading
  }, [isLoading])

  const selectedModelOption = useMemo(
    () => modelOptions.find(item => item.model === selectedModel),
    [modelOptions, selectedModel]
  )
  const selectedModelDisplayLabel = useMemo(() => {
    return selectedModelOption?.label || selectedModel || ''
  }, [selectedModelOption, selectedModel])
  const supportsReasoning = selectedModelOption?.isReasoning ?? false
  const supportsReasoningControl =
    selectedModelOption?.supportReasoningControl ?? false
  const supportsImageUpload = supportsVision(selectedModelOption)

  const handleAgentChange = useCallback(
    (agent: Agent) => {
      invalidateRequests()
      setSelectedAgent(agent)
      setCurrentThreadId(null)
      currentThreadIdRef.current = null
      setMessages([])
      setImagesByMessageId({})
      setAssistantModelById({})
      pendingImageBatchesRef.current = []
      setUploadedImageUrls([])
      setImagePreviews([])
      setThreadSearch('')
      shouldAutoScrollRef.current = true
      setShowScrollToBottom(false)
      // 切换 agent 时清空 pending 状态，避免遗留的 plan/clarify 阻塞新会话 loading
      pendingPlanRef.current = null
      setPendingPlan(null)
      setPlanPanelStatus('pending')
      setPlanStatuses([])
      pendingClarifyRef.current = null
      setPendingClarify(null)
      pendingApprovalRunIdRef.current = null
      approvalAssistantIdRef.current = null
      approvalResumeCursorRef.current = ''
      setPendingApprovalRunId(null)
      setPendingApprovals([])
    },
    [currentThreadIdRef, invalidateRequests, setCurrentThreadId]
  )

  useEffect(() => {
    if (!supportsImageUpload && imagePreviews.length > 0) {
      setImagePreviews([])
      setUploadedImageUrls([])
      toast.info(t('imageUploadRemovedUnsupported'))
    }
  }, [supportsImageUpload, imagePreviews.length, t])

  useEffect(() => {
    const userMessages = messages.filter(
      message => isRenderableMessage(message) && message.role === 'user'
    )
    if (!userMessages.length) return

    const nextPairs: Array<[string, string[]]> = []

    userMessages.forEach(message => {
      if (imagesByMessageId[message.id]) return

      const fromMessage = extractImageUrlsFromMessageParts(message.parts)
      if (fromMessage.length > 0) {
        nextPairs.push([message.id, fromMessage])
        return
      }

      const pending = pendingImageBatchesRef.current[0]
      if (pending && pending.length > 0) {
        pendingImageBatchesRef.current.shift()
        nextPairs.push([message.id, pending])
      }
    })

    if (!nextPairs.length) return

    setImagesByMessageId(prev => {
      const next = { ...prev }
      nextPairs.forEach(([id, urls]) => {
        next[id] = urls
      })
      return next
    })
  }, [messages, imagesByMessageId])

  const buildRequestBody = (
    images?: string[],
    threadId?: string | null
  ): {
    agentId?: string
    threadId?: string
    model?: string
    reasoningEffort?: string
    images?: string[]
    planMode?: 'plan' | 'execute'
    approvedPlan?: string
  } => {
    const body: {
      agentId?: string
      threadId?: string
      model?: string
      reasoningEffort?: string
      images?: string[]
      planMode?: 'plan' | 'execute'
      approvedPlan?: string
    } = {}
    if (selectedAgent?.id) {
      body.agentId = selectedAgent.id
    }
    if (threadId) {
      body.threadId = threadId
    }
    if (selectedModel) {
      body.model = selectedModel
    }
    if (supportsReasoning) {
      body.reasoningEffort = reasoningEffort
    }
    if (supportsImageUpload && images && images.length > 0) {
      body.images = images
    }
    // plan 模式：仅在 plan 状态时携带 planMode
    if (planMode === 'plan') {
      body.planMode = 'plan'
    }
    return body
  }

  const uiMessages = useMemo((): Message[] => {
    return messages.filter(isRenderableMessage).map(message => {
      const textFromParts = Array.isArray(message.parts)
        ? message.parts
            .filter(isTextPart)
            .map(part => part.text)
            .join('')
        : ''
      const fallbackText = extractLegacyContent(message)
      const rawTextContent = textFromParts || fallbackText
      const textContent = getDisplayMessageContent(
        rawTextContent,
        t('voiceInput')
      )

      const assistantContentParts =
        message.role === 'assistant' && Array.isArray(message.parts)
          ? extractAssistantContentParts(message.parts)
          : message.role === 'assistant' && fallbackText
            ? (() => {
                const fallbackParts: ContentPartItem[] = []
                pushTaggedTextParts(fallbackText, fallbackParts)
                return fallbackParts
              })()
            : []
      const toolCalls = assistantContentParts
        .filter(part => part.type === 'tool')
        .map(part => part.tool)

      return {
        id: message.id,
        role: message.role,
        runId: message.runId,
        content: textContent,
        isVoiceTranscript:
          message.role === 'user'
            ? Boolean(message.isVoiceTranscript) ||
              hasLiveTranscriptMarker(message.parts) ||
              isVoicePlaceholder(rawTextContent)
            : false,
        images:
          message.role === 'user' ? (imagesByMessageId[message.id] ?? []) : [],
        contentParts:
          message.role === 'assistant' ? assistantContentParts : undefined,
        toolCalls: message.role === 'assistant' ? toolCalls : undefined,
        modelLabel:
          message.role === 'assistant'
            ? resolveMessageModelLabel({
                persistedModelKey: message.modelKey,
                transientLabel: assistantModelById[message.id],
                modelOptions,
              })
            : undefined,
      }
    })
  }, [messages, imagesByMessageId, assistantModelById, modelOptions, t])

  useEffect(() => {
    const fallbackLabel =
      pendingReplyModelLabelRef.current || selectedModelDisplayLabel
    if (!fallbackLabel) return

    const assistantMessages = messages.filter(
      message => message.role === 'assistant'
    )
    if (!assistantMessages.length) return

    setAssistantModelById(prev => {
      let changed = false
      const next = { ...prev }

      assistantMessages.forEach(message => {
        if (!next[message.id]) {
          next[message.id] = fallbackLabel
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [messages, selectedModelDisplayLabel])

  const displayMessages = useMemo(() => {
    const visibleUiMessages = uiMessages.filter(message => {
      if (message.role !== 'assistant' || message.content.trim()) return true
      const parts = message.contentParts ?? []
      return !(parts.length > 0 && parts.every(part => part.type === 'clarify'))
    })
    if (!isLoading || pendingClarify) return visibleUiMessages
    const last = visibleUiMessages[visibleUiMessages.length - 1]
    if (last && last.role === 'assistant') return visibleUiMessages
    return [
      ...visibleUiMessages,
      {
        id: 'pending-assistant',
        role: 'assistant' as const,
        content: '',
      },
    ]
  }, [uiMessages, isLoading, pendingClarify])

  const lastUserMessage = useMemo(() => {
    for (let i = displayMessages.length - 1; i >= 0; i -= 1) {
      if (displayMessages[i]?.role === 'user') {
        return displayMessages[i]?.content || ''
      }
    }
    return ''
  }, [displayMessages])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    lastScrollTopRef.current = container.scrollTop

    const updateAutoScrollState = () => {
      const currentScrollTop = container.scrollTop
      const isScrollingUp = currentScrollTop < lastScrollTopRef.current - 1
      lastScrollTopRef.current = currentScrollTop

      if (isStreamingRef.current && isScrollingUp) {
        shouldAutoScrollRef.current = false
        setShowScrollToBottom(true)
        return
      }

      const distanceToBottom =
        container.scrollHeight - currentScrollTop - container.clientHeight
      const isNearBottom = distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX

      if (isNearBottom) {
        shouldAutoScrollRef.current = true
        setShowScrollToBottom(false)
        return
      }

      // 仅在流式生成期间用户上滑时，暂停自动跟随到底部
      if (isStreamingRef.current && shouldAutoScrollRef.current) {
        shouldAutoScrollRef.current = false
      }

      // 无论是否在生成，只要离开底部就展示“回到底部”按钮
      setShowScrollToBottom(true)
    }

    updateAutoScrollState()
    container.addEventListener('scroll', updateAutoScrollState, {
      passive: true,
    })

    return () => {
      container.removeEventListener('scroll', updateAutoScrollState)
    }
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || !shouldAutoScrollRef.current) return

    window.requestAnimationFrame(() => {
      if (!scrollRef.current || !shouldAutoScrollRef.current) return
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [displayMessages])

  const handleScrollToBottom = () => {
    const container = scrollRef.current
    if (!container) return

    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    })
  }

  const handleSend = async (
    messageContent?: string,
    options?: { allowWhileLoading?: boolean }
  ) => {
    const hasImages = supportsImageUpload && uploadedImageUrls.length > 0
    const shouldUseMessageContent =
      messageContent && typeof messageContent === 'string'
    const textInput = (shouldUseMessageContent ? messageContent : input)
      .toString()
      .trim()
    const contentToSend =
      textInput || (hasImages ? IMAGE_PLACEHOLDER_PROMPT : '')
    if (!contentToSend || (isLoading && !options?.allowWhileLoading)) return

    setInput('')
    const previewBatch = supportsImageUpload ? [...imagePreviews] : []
    const imagesForRequest = hasImages ? [...uploadedImageUrls] : []
    if (previewBatch.length > 0) {
      setImagePreviews([])
      setUploadedImageUrls([])
    }
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    pendingReplyModelLabelRef.current = selectedModelDisplayLabel

    if (realtimeEnabled) {
      pendingReplyModelLabelRef.current = t('voice.modelLabel')
      const userMessageId = createClientMessageId('user')
      const assistantMessageId = createClientMessageId('assistant')
      setActiveAssistantId(assistantMessageId)
      setMessages(prev => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: contentToSend,
          parts: [{ type: 'text', text: contentToSend }],
        },
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          parts: [],
        },
      ])
      await streamRealtimeTextMessage(contentToSend, assistantMessageId)
      textareaRef.current?.focus()
      return
    }

    let threadIdForRequest = currentThreadId
    if (!threadIdForRequest && selectedAgent?.id) {
      const thread = await agentService.createThread({
        agentId: selectedAgent.id,
        title: contentToSend,
      })
      threadIdForRequest = thread.id
      currentThreadIdRef.current = thread.id
      setCurrentThreadId(thread.id)
      setThreads(prev => [thread, ...prev])
    }

    const userMessageId = createClientMessageId('user')
    const assistantMessageId = createClientMessageId('assistant')
    setActiveAssistantId(assistantMessageId)
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: contentToSend,
        parts: [{ type: 'text', text: contentToSend }],
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        parts: [],
      },
    ])
    if (previewBatch.length > 0) {
      setImagesByMessageId(prev => ({
        ...prev,
        [userMessageId]: previewBatch,
      }))
    }

    await streamAgentMessage(
      {
        messages: [
          {
            role: 'user',
            parts: [{ type: 'text', text: contentToSend }],
          },
        ],
        ...buildRequestBody(imagesForRequest, threadIdForRequest),
      },
      assistantMessageId
    )
    await loadThreads()
    textareaRef.current?.focus()
  }

  /**
   * 批准计划：切换到 approved 状态，发 execute 请求让 Agent 真正执行。
   * 计划面板保持显示（输入框上方），步骤状态实时更新。
   */
  const handleApprovePlan = async () => {
    if (
      !pendingPlan ||
      isLoading ||
      !currentThreadId ||
      planActionBusyRef.current
    ) {
      return
    }
    planActionBusyRef.current = true
    const { messageId, uiMessageId, steps } = pendingPlan

    if (planPanelStatus === 'pending') {
      try {
        await agentService.decidePlan(messageId, 'approved')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
        planActionBusyRef.current = false
        return
      }
    }
    setMessages(prev =>
      prev.map(message => {
        if (message.id !== uiMessageId || !Array.isArray(message.parts)) {
          return message
        }
        return {
          ...message,
          parts: message.parts.map(part => {
            if (!part || typeof part !== 'object') return part
            const raw = part as Record<string, any>
            if (raw.type !== 'plan') return part
            return {
              ...raw,
              plan: { ...(raw.plan ?? raw), status: 'executing' },
            }
          }),
        }
      })
    )
    setPlanPanelStatus('executing')
    setPlanStatuses(steps.map(() => 'pending'))
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)

    // 创建新的 assistant 占位消息用于接收执行结果
    const assistantMessageId = createClientMessageId('assistant')
    setActiveAssistantId(assistantMessageId)
    setMessages(prev => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        parts: [],
      },
    ])

    // execute 请求：带结构化 approvedPlan
    const body = buildRequestBody(undefined, currentThreadId)
    const streamEnd = await streamAgentMessage(
      {
        messages: [
          {
            role: 'user',
            parts: [{ type: 'text', text: t('plan.executeTrigger') }],
          },
        ],
        ...body,
        planMode: 'execute',
        approvedPlanMessageId: messageId,
      },
      assistantMessageId
    )
    try {
      if (streamEnd?.end === 'terminal' || !streamEnd) {
        await loadThreadMessages(currentThreadId)
      }
    } finally {
      planActionBusyRef.current = false
    }
    textareaRef.current?.focus()
  }

  /**
   * 放弃计划：切换面板状态为 rejected，稍后清空。
   */
  const handleRejectPlan = async () => {
    if (!pendingPlan || isLoading || planActionBusyRef.current) return
    planActionBusyRef.current = true
    try {
      await agentService.decidePlan(pendingPlan.messageId, 'rejected')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      planActionBusyRef.current = false
      return
    }
    setPlanPanelStatus('rejected')
    setMessages(prev =>
      prev.map(message => {
        if (
          message.id !== pendingPlan.uiMessageId ||
          !Array.isArray(message.parts)
        ) {
          return message
        }
        return {
          ...message,
          parts: message.parts.map(part => {
            if (!part || typeof part !== 'object') return part
            const raw = part as Record<string, any>
            if (raw.type !== 'plan') return part
            return {
              ...raw,
              plan: { ...(raw.plan ?? raw), status: 'rejected' },
            }
          }),
        }
      })
    )
    pendingPlanRef.current = null
    // 延迟清空，让用户看到 rejected 状态
    const rejectedMessageId = pendingPlan.messageId
    setTimeout(() => {
      setPendingPlan(current => {
        if (current && current.messageId !== rejectedMessageId) return current
        setPlanPanelStatus('pending')
        setPlanStatuses([])
        return null
      })
    }, 2000)
    planActionBusyRef.current = false
    textareaRef.current?.focus()
  }

  /**
   * 选择澄清选项：提交用户所选项，并以用户身份发送回复以使对话继续执行。
   */
  const handleClarifySelect = async (messageId: string, option: string) => {
    if (!currentThreadId) {
      throw new Error('A thread is required to answer a clarification')
    }
    try {
      await agentService.answerClarify(messageId, option)
      // 局部更新本地消息列表中的 clarify part 状态，避免二次刷新导致重复点选
      setMessages(prev =>
        prev.map(msg => {
          if (!Array.isArray(msg.parts)) return msg
          const ownsClarification =
            msg.id === messageId ||
            msg.parts.some((part: any) => {
              if (!part || part.type !== 'clarify') return false
              const clarify = part.clarify ?? part
              return (
                clarify.messageId === messageId ||
                clarify.message_id === messageId
              )
            })
          if (!ownsClarification) return msg
          const newParts = msg.parts.map((part: any) => {
            if (part && part.type === 'clarify' && part.clarify) {
              return {
                ...part,
                clarify: {
                  ...part.clarify,
                  status: 'answered',
                  selectedOption: option,
                },
              }
            }
            return part
          })
          return { ...msg, parts: newParts }
        })
      )
    } catch (err) {
      console.error('Failed to answer clarify question:', err)
      throw err
    }
    // 持久化成功后再解除等待态；失败时保留卡片，允许用户重试。
    pendingClarifyRef.current = null
    setPendingClarify(null)
    setStatus('ready')
    // 自动将用户的选择作为新指令发送
    await handleSend(option, { allowWhileLoading: true })
  }

  // 消费 pendingPrompt:当 selectedAgent 就绪后,自动发送预填消息(仅一次)。
  // handleSend 在 isLoading 或无 agent 时会提前 return,所以必须等 agent 就绪。
  useEffect(() => {
    if (
      pendingPromptRef.current &&
      selectedAgent?.id &&
      !isLoading &&
      messages.length === 0
    ) {
      const msg = pendingPromptRef.current
      pendingPromptRef.current = null
      handleSend(msg)
    }
    // handleSend 故意不进依赖:它是每次渲染重建的回调,加入会导致循环触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent?.id, isLoading, messages.length])

  const handlePickImages = async (files: FileList | File[] | null) => {
    if (!files) return
    if (!supportsImageUpload) {
      toast.error(t('imageUploadDisabledLabel'))
      return
    }
    const remaining = Math.max(
      0,
      MAX_IMAGE_ATTACHMENTS - uploadedImageUrls.length
    )
    if (remaining <= 0) {
      toast.error(t('imageUploadLimitError', { count: MAX_IMAGE_ATTACHMENTS }))
      return
    }

    const filesArray = files instanceof FileList ? Array.from(files) : files
    if (filesArray.length === 0) return

    const picked = filesArray
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remaining)

    if (!picked.length) {
      toast.error(t('imageUploadTypeError'))
      return
    }

    try {
      setIsUploadingImages(true)
      const uploadedPairs = await Promise.all(
        picked.map(async file => {
          try {
            const [previewUrl, remoteUrl] = await Promise.all([
              fileToDataUrl(file),
              uploadImageToCos(file),
            ])
            return { previewUrl, remoteUrl }
          } catch (error) {
            console.error('COS upload failed', error)
            return null
          }
        })
      )

      const successPairs = uploadedPairs.filter(
        (item): item is { previewUrl: string; remoteUrl: string } =>
          item !== null
      )

      if (successPairs.length < picked.length) {
        toast.error(t('imageUploadFailedError'))
      }
      if (!successPairs.length) return

      setImagePreviews(prev =>
        [...prev, ...successPairs.map(item => item.previewUrl)].slice(
          0,
          MAX_IMAGE_ATTACHMENTS
        )
      )
      setUploadedImageUrls(prev =>
        [...prev, ...successPairs.map(item => item.remoteUrl)].slice(
          0,
          MAX_IMAGE_ATTACHMENTS
        )
      )
    } catch (error) {
      console.error('Failed to parse selected images', error)
      toast.error(t('imageUploadFailedError'))
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleRetry = (retryRunId: string) => {
    const retryTarget = getLatestRetryTarget(messages)
    if (!retryTarget || retryTarget.runId !== retryRunId || isLoading) {
      return
    }
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    pendingReplyModelLabelRef.current = selectedModelDisplayLabel
    const assistantMessageId = createClientMessageId('assistant')
    setActiveAssistantId(assistantMessageId)
    setMessages(prev =>
      replaceLatestAssistant(prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        parts: [],
      })
    )
    void streamAgentMessage(
      {
        messages: [
          {
            role: 'user',
            parts: [{ type: 'text', text: retryTarget.userContent }],
          },
        ],
        ...buildRequestBody(undefined, currentThreadId),
        retryRunId,
      },
      assistantMessageId
    )
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClear = () => {
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    pendingImageBatchesRef.current = []
    setImagesByMessageId({})
    setUploadedImageUrls([])
    setImagePreviews([])
    setAssistantModelById({})
    setCurrentThreadId(null)
    setMessages([])
    pendingPlanRef.current = null
    setPendingPlan(null)
    setPlanPanelStatus('pending')
    setPlanStatuses([])
    pendingClarifyRef.current = null
    setPendingClarify(null)
    pendingApprovalRunIdRef.current = null
    approvalAssistantIdRef.current = null
    approvalResumeCursorRef.current = ''
    setPendingApprovalRunId(null)
    setPendingApprovals([])
  }

  const handleStop = () => {
    const runId = activeRunIdRef.current ?? pendingApprovalRunIdRef.current
    if (runId) {
      void agentService.cancelRun(runId).catch(error => {
        console.error('Failed to cancel run', error)
      })
    }
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    activeRunIdRef.current = null
    pendingApprovalRunIdRef.current = null
    approvalAssistantIdRef.current = null
    approvalResumeCursorRef.current = ''
    setPendingApprovalRunId(null)
    setPendingApprovals([])
    pendingClarifyRef.current = null
    setPendingClarify(null)
    setStatus('ready')
    setActiveAssistantId(null)
    shouldAutoScrollRef.current = false
  }

  const handleNewThread = () => {
    setCurrentThreadId(null)
    setMessages([])
    pendingPlanRef.current = null
    setPendingPlan(null)
    setPlanPanelStatus('pending')
    setPlanStatuses([])
    pendingClarifyRef.current = null
    setPendingClarify(null)
    setImagesByMessageId({})
    setAssistantModelById({})
    pendingImageBatchesRef.current = []
    pendingApprovalRunIdRef.current = null
    approvalAssistantIdRef.current = null
    approvalResumeCursorRef.current = ''
    setPendingApprovalRunId(null)
    setPendingApprovals([])
    shouldAutoScrollRef.current = true
  }

  const handleSelectThread = selectThread
  const handleRenameThread = beginRenameThread
  const handleConfirmRenameThread = confirmRenameThread
  const handleDeleteThread = beginDeleteThread
  const handleConfirmDeleteThread = confirmDeleteThread

  const realtimeStatusLabel = realtimeConfigLoading
    ? t('voice.loading')
    : realtimeAvailable
      ? realtimeConfig?.demo
        ? t('voice.demo')
        : t('voice.ready')
      : t('voice.unconfigured')
  const realtimeMissingEnv = realtimeConfig?.missingEnv ?? []
  const realtimeMicLabel =
    realtimeMicState === 'connecting'
      ? t('voice.connecting')
      : realtimeMicState === 'reconnecting'
        ? t('reconnecting')
        : realtimeMicState === 'listening'
          ? t('voice.listening')
          : realtimeMicState === 'speaking'
            ? t('voice.speaking')
            : realtimeMicState === 'error'
              ? t('voice.error')
              : t('voice.idle')
  const realtimeElapsedLabel = formatElapsedSeconds(realtimeElapsedSeconds)
  const realtimeToolbarControl = (
    <button
      type='button'
      onClick={() => setRealtimeEnabled(prev => !prev)}
      disabled={isLoading || realtimeConfigLoading}
      className={`inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-mono text-[10px] transition-all duration-200 active:scale-[0.98] ${
        realtimeEnabled
          ? 'bg-foreground text-background'
          : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
      } ${isLoading || realtimeConfigLoading ? 'opacity-60' : ''}`}
      aria-pressed={realtimeEnabled}
      aria-label={t('voice.toggle')}
      title={t('voice.toggle')}
    >
      <Mic2 className='size-3.5 shrink-0' />
      <span className='truncate'>{t('voice.shortLabel')}</span>
    </button>
  )
  const getAuraState = (): VoiceAuraState => {
    if (realtimeMicState === 'connecting') return 'connecting'
    if (realtimeMicState === 'reconnecting') return 'reconnecting'
    if (realtimeMicState === 'listening') return 'listening'
    if (realtimeMicState === 'speaking') return 'speaking'
    if (realtimeMicState === 'error') return 'error'
    return 'idle'
  }

  const realtimeStatusPanel = realtimeEnabled ? (
    <RealtimeVoiceControl
      state={getAuraState()}
      amplitude={realtimeVolumeAmplitude}
      active={isRealtimeMicActive}
      muted={realtimeMuted}
      available={realtimeAvailable}
      statusLabel={realtimeStatusLabel}
      stateLabel={realtimeMicLabel}
      elapsedLabel={realtimeElapsedLabel}
      errorText={realtimeErrorText}
      configurationText={
        realtimeMissingEnv.length > 0
          ? t('voice.missingConfig', { count: realtimeMissingEnv.length })
          : null
      }
      muteLabel={t('voice.mute')}
      unmuteLabel={t('voice.unmute')}
      mutedLabel={t('voice.muted')}
      interruptLabel={t('voice.interrupt')}
      disconnectLabel={t('voice.disconnect')}
      canInterrupt={isLoading && realtimeMicState === 'speaking'}
      onMutedChange={() => setRealtimeMuted(prev => !prev)}
      onInterrupt={handleStop}
      onDisconnect={() => setRealtimeEnabled(false)}
    />
  ) : null

  const filteredThreads = threads.filter(thread => {
    const title = getDisplayThreadTitle(thread.title, t('voiceChat'))
    if (!threadSearch.trim()) return true
    return title.toLowerCase().includes(threadSearch.trim().toLowerCase())
  })

  return (
    <>
      <div className='agent-workbench flex h-full min-h-0 w-full overflow-hidden text-foreground'>
        <aside
          className={cn(
            'hidden shrink-0 transition-[width] duration-300 ease-out md:block',
            sidebarCollapsed ? 'w-[52px]' : 'w-56'
          )}
        >
          <AgentThreadSidebar
            threads={threads}
            filteredThreads={filteredThreads}
            currentThreadId={currentThreadId}
            threadsLoading={threadsLoading}
            threadSearch={threadSearch}
            selectedAgentId={selectedAgent?.id ?? null}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            onSearchChange={setThreadSearch}
            onAgentChange={handleAgentChange}
            onNewThread={handleNewThread}
            onSelectThread={threadId => void handleSelectThread(threadId)}
            onRenameThread={handleRenameThread}
            onDeleteThread={handleDeleteThread}
            getThreadTitle={thread =>
              getDisplayThreadTitle(thread.title, t('voiceChat'))
            }
            labels={{
              title: t('threads.title'),
              newThread: t('threads.new'),
              search: t('threads.search'),
              empty: t('threads.empty'),
              noResults: t('threads.noResults'),
              rename: t('threads.rename'),
              delete: t('threads.delete'),
            }}
          />
        </aside>
        <div className='relative min-w-0 flex-1 bg-background/82'>
          <Sheet open={mobileThreadsOpen} onOpenChange={setMobileThreadsOpen}>
            <SheetTrigger asChild>
              <button
                type='button'
                className='agent-surface-shadow absolute left-3 top-3 z-40 grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:hidden'
                aria-label={t('threads.title')}
              >
                <MessageSquare className='size-4' />
              </button>
            </SheetTrigger>
            <SheetContent
              side='left'
              className='agent-workbench w-[min(88vw,224px)] gap-0 border-r border-border bg-card p-0 [&_[data-slot=sheet-close]]:top-3 [&_[data-slot=sheet-close]]:right-3'
            >
              <SheetTitle className='sr-only'>{t('threads.title')}</SheetTitle>
              <AgentThreadSidebar
                threads={threads}
                filteredThreads={filteredThreads}
                currentThreadId={currentThreadId}
                threadsLoading={threadsLoading}
                threadSearch={threadSearch}
                selectedAgentId={selectedAgent?.id ?? null}
                onSearchChange={setThreadSearch}
                onAgentChange={handleAgentChange}
                onNewThread={() => {
                  handleNewThread()
                  setMobileThreadsOpen(false)
                }}
                onSelectThread={threadId => {
                  void handleSelectThread(threadId)
                  setMobileThreadsOpen(false)
                }}
                onRenameThread={handleRenameThread}
                onDeleteThread={handleDeleteThread}
                getThreadTitle={thread =>
                  getDisplayThreadTitle(thread.title, t('voiceChat'))
                }
                labels={{
                  title: t('threads.title'),
                  newThread: t('threads.new'),
                  search: t('threads.search'),
                  empty: t('threads.empty'),
                  noResults: t('threads.noResults'),
                  rename: t('threads.rename'),
                  delete: t('threads.delete'),
                }}
              />
            </SheetContent>
          </Sheet>
          <SkillTrigger
            input={input}
            agentId={selectedAgent?.id ?? null}
            onPick={handleSkillPick}
            registerControls={controls => {
              skillTriggerControlsRef.current = controls
            }}
          />
          <ChatContainer
            selectedModel={selectedModel}
            modelOptions={modelOptions}
            messages={displayMessages}
            input={input}
            isLoading={isLoading}
            activeAssistantId={activeAssistantId}
            copiedId={copiedId}
            suggestionPrompts={suggestionPrompts}
            lastUserMessage={lastUserMessage}
            scrollRef={scrollRef}
            textareaRef={textareaRef}
            onInputChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            onRetry={handleRetry}
            onCopy={handleCopy}
            pendingPlanMessageId={pendingPlan?.uiMessageId ?? null}
            onApprovePlan={handleApprovePlan}
            onRejectPlan={handleRejectPlan}
            onClear={handleClear}
            onScrollToBottom={handleScrollToBottom}
            onModelChange={setSelectedModel}
            reasoningEffort={reasoningEffort}
            onReasoningEffortChange={setReasoningEffort}
            modelLabel={t('model.label')}
            modelEmptyLabel={t('model.empty')}
            modelReasoningLabel={t('model.reasoning')}
            modelGroupDeepseekLabel={t('model.group.deepseek')}
            modelGroupSeedLabel={t('model.group.seed')}
            modelGroupBailianLabel={t('model.group.bailian')}
            modelGroupGcloudLabel={t('model.group.gcloud')}
            modelGroupOpenAILabel={t('model.group.openai')}
            modelGroupShortApiLabel={t('model.group.shortapi')}
            reasoningEffortLabel={t('toolbar.reasoning')}
            reasoningEffortMinimal={t('reasoningEffort.minimal')}
            reasoningEffortLow={t('reasoningEffort.low')}
            reasoningEffortMedium={t('reasoningEffort.medium')}
            reasoningEffortHigh={t('reasoningEffort.high')}
            planMode={planMode}
            onPlanModeChange={setPlanMode}
            planLabel={t('toolbar.plan')}
            autoLabel={t('toolbar.auto')}
            planTitle={t('plan.title')}
            planApproveLabel={t('plan.approve')}
            planRejectLabel={t('plan.reject')}
            planApprovedLabel={t('plan.approved')}
            planRejectedLabel={t('plan.rejected')}
            planPendingLabel={t('plan.pending')}
            planCompletedLabel={t('plan.completed')}
            planFailedLabel={t('plan.failed')}
            executingLabel={t('plan.executing')}
            planPanel={
              pendingPlan ? (
                <PlanPanel
                  summary={pendingPlan.summary}
                  steps={pendingPlan.steps}
                  status={planPanelStatus}
                  stepStatuses={
                    planStatuses.length > 0 ? planStatuses : undefined
                  }
                  titleLabel={t('plan.title')}
                  approveLabel={t('plan.approve')}
                  rejectLabel={t('plan.reject')}
                  approvedLabel={t('plan.approved')}
                  rejectedLabel={t('plan.rejected')}
                  pendingLabel={t('plan.pending')}
                  completedLabel={t('plan.completed')}
                  failedLabel={t('plan.failed')}
                  executingLabel={t('plan.executing')}
                  onApprove={
                    planPanelStatus === 'pending' ||
                    planPanelStatus === 'approved'
                      ? handleApprovePlan
                      : undefined
                  }
                  onReject={
                    planPanelStatus === 'pending' ? handleRejectPlan : undefined
                  }
                />
              ) : undefined
            }
            clarificationPanel={
              pendingClarify ? (
                <ClarifyPanel
                  messageId={pendingClarify.messageId}
                  question={pendingClarify.question}
                  options={pendingClarify.options}
                  status='pending'
                  placement='composer'
                  onSelect={option =>
                    handleClarifySelect(pendingClarify.messageId, option)
                  }
                />
              ) : undefined
            }
            clearConversationLabel={t('clearConversation')}
            refreshSuggestionsLabel={t('actions.refresh')}
            scrollToBottomLabel={t('actions.scrollToBottom')}
            inputPlaceholder={t('input.placeholder')}
            sendAriaLabel={t('input.sendAriaLabel')}
            stopAriaLabel={t('actions.stop')}
            disclaimer={t('disclaimer')}
            emptyStateTitle={t('emptyState.title')}
            emptyStateDescription={t('emptyState.description')}
            copyLabel={t('actions.copy')}
            copiedLabel={t('actions.copied')}
            retryLabel={t('actions.retry')}
            usedModelLabel={t('actions.usedModel')}
            reasoningTitle={t('reasoning.title')}
            reasoningThinkingLabel={t('reasoning.thinking')}
            reasoningDoneLabel={t('reasoning.done')}
            showScrollToBottom={showScrollToBottom}
            showReasoningEffort={supportsReasoning}
            showReasoningControl={supportsReasoningControl}
            showImageUpload={supportsImageUpload}
            imagePreviews={imagePreviews}
            onPickImages={handlePickImages}
            onRemoveImage={handleRemoveImage}
            imageUploadLabel={t('imageUploadLabel')}
            imageUploadDisabledLabel={t('imageUploadDisabledLabel')}
            imageUploadingLabel={t('imageUploadingLabel')}
            imageDropLabel={t('imageDropLabel')}
            imageRemoveLabel={t('imageRemoveLabel')}
            imagePreviewLabel={t('actions.previewImage')}
            imagePrevLabel={t('actions.prevImage')}
            imageNextLabel={t('actions.nextImage')}
            disableModelSelect={isLoading || modelOptions.length === 0}
            disableReasoningEffort={isLoading || isUploadingImages}
            isUploadingImages={isUploadingImages}
            toolbarLeading={realtimeToolbarControl}
            realtimeStatusPanel={realtimeStatusPanel}
            userAvatarUrl={userAvatarUrl}
            userInitials={userInitials}
          />
        </div>
      </div>

      <Dialog
        open={Boolean(pendingApprovalRunId)}
        onOpenChange={open => {
          if (
            !open &&
            !pendingApprovals.some(item => item.status === 'pending')
          ) {
            pendingApprovalRunIdRef.current = null
            approvalAssistantIdRef.current = null
            setPendingApprovalRunId(null)
            setPendingApprovals([])
            setStatus('ready')
          }
        }}
      >
        <DialogContent className='agent-workbench max-h-[85vh] gap-0 overflow-y-auto rounded-2xl border-border bg-card p-0 sm:max-w-lg'>
          <DialogHeader className='border-b border-border px-5 py-4 text-left'>
            <DialogTitle className='text-[17px] tracking-[-0.02em]'>
              {t('approval.title')}
            </DialogTitle>
            <DialogDescription className='text-[13px] leading-5'>
              {t('approval.description')}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 p-4'>
            {pendingApprovals.length === 0 ? (
              <p className='rounded-xl bg-muted p-4 text-sm text-muted-foreground'>
                {t('approval.empty')}
              </p>
            ) : (
              pendingApprovals.map(approval => {
                const isPending =
                  !approval.status || approval.status === 'pending'
                const statusLabel = isPending
                  ? t('approval.waiting')
                  : approval.status === 'approved'
                    ? t('approval.approved')
                    : approval.status === 'denied'
                      ? t('approval.denied')
                      : t('approval.expired')
                return (
                  <div
                    key={approval.id}
                    className={cn(
                      'overflow-hidden rounded-2xl border bg-card transition-colors',
                      isPending ? 'border-primary/30' : 'border-border'
                    )}
                  >
                    <div className='flex items-start justify-between gap-3 p-4'>
                      <div className='min-w-0'>
                        <p className='font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground'>
                          {t('approval.tool')}
                        </p>
                        <p className='mt-1 break-all font-mono text-[13px] font-medium text-foreground'>
                          {approval.tool_name}
                        </p>
                      </div>
                      <span className='shrink-0 rounded-full bg-accent px-2 py-1 font-mono text-[9px] text-accent-foreground'>
                        {statusLabel}
                      </span>
                    </div>
                    <div className='border-y border-border bg-muted/45 px-4 py-3'>
                      <p className='font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground'>
                        {t('approval.arguments')}
                      </p>
                      <pre className='mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground/80'>
                        {formatApprovalArguments(approval.arguments)}
                      </pre>
                    </div>
                    <p className='px-4 pt-3 font-mono text-[9px] text-muted-foreground'>
                      {t('approval.expires', {
                        time: formatApprovalExpiry(approval.expires_at),
                      })}
                    </p>
                    {isPending && (
                      <div className='flex gap-2 px-4 py-3'>
                        <Button
                          type='button'
                          variant='outline'
                          className='min-w-24 flex-1 rounded-lg bg-card'
                          disabled={approvalBusyId !== null}
                          onClick={() =>
                            void handleApprovalDecision(approval, 'denied')
                          }
                        >
                          {t('approval.deny')}
                        </Button>
                        <Button
                          type='button'
                          className='min-w-28 flex-1 rounded-lg'
                          disabled={approvalBusyId !== null}
                          onClick={() =>
                            void handleApprovalDecision(approval, 'approved')
                          }
                        >
                          {t('approval.approve')}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(threadToRename)}
        onOpenChange={open => {
          if (!open && !isRenamingThread) {
            setThreadToRename(null)
            setRenameThreadTitle('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('threads.renameTitle')}</DialogTitle>
            <DialogDescription>
              {t('threads.renameDescription')}
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={event => {
              event.preventDefault()
              void handleConfirmRenameThread()
            }}
          >
            <Input
              value={renameThreadTitle}
              onChange={event => setRenameThreadTitle(event.target.value)}
              placeholder={t('threads.renamePlaceholder')}
              disabled={isRenamingThread}
              autoFocus
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={isRenamingThread}
                onClick={() => {
                  setThreadToRename(null)
                  setRenameThreadTitle('')
                }}
              >
                {t('threads.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={isRenamingThread || !renameThreadTitle.trim()}
              >
                {isRenamingThread ? t('threads.saving') : t('threads.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(threadToDelete)}
        onOpenChange={open => {
          if (!open && !isDeletingThread) setThreadToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('threads.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('threads.deleteConfirm', {
                title: getDisplayThreadTitle(
                  threadToDelete?.title,
                  t('voiceChat')
                ),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingThread}>
              {t('threads.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingThread}
              onClick={event => {
                event.preventDefault()
                void handleConfirmDeleteThread()
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeletingThread ? t('threads.deleting') : t('threads.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
