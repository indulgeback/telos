import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentThread, AgentMessage } from '@/service/agent'
import { agentService } from '@/service/agent'

import { LatestRequest } from './latest-request'
type UseChatThreadsOptions = {
  agentId?: string
  isLoading: boolean
  voiceTitle: (title?: string | null) => string
  onRestoreMessages: (messages: AgentMessage[]) => void
  onClearAgent: () => void
  onCurrentThreadDeleted: () => void
}

export function useChatThreads({
  agentId,
  isLoading,
  voiceTitle,
  onRestoreMessages,
  onClearAgent,
  onCurrentThreadDeleted,
}: UseChatThreadsOptions) {
  const [threads, setThreads] = useState<AgentThread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const currentThreadIdRef = useRef<string | null>(null)
  const requests = useRef(new LatestRequest()).current
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [threadToRename, setThreadToRename] = useState<AgentThread | null>(null)
  const [renameThreadTitle, setRenameThreadTitle] = useState('')
  const [isRenamingThread, setIsRenamingThread] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState<AgentThread | null>(null)
  const [isDeletingThread, setIsDeletingThread] = useState(false)

  useEffect(() => {
    currentThreadIdRef.current = currentThreadId
  }, [currentThreadId])

  useEffect(() => () => requests.invalidate(), [agentId, requests])

  const loadThreadMessages = useCallback(
    async (threadId: string, requestId = requests.next()) => {
      return requests.run(
        () => agentService.listThreadMessages(threadId),
        messages => {
          onRestoreMessages(messages)
          currentThreadIdRef.current = threadId
          setCurrentThreadId(threadId)
        },
        requestId
      )
    },
    [onRestoreMessages, requests]
  )

  const loadThreads = useCallback(
    async (options?: { selectLatest?: boolean }) => {
      const requestId = requests.next()
      if (!agentId) {
        setThreads([])
        setCurrentThreadId(null)
        onClearAgent()
        setThreadsLoading(false)
        return
      }
      setThreadsLoading(true)
      try {
        const data = await agentService.listThreads({ agentId })
        if (!requests.isCurrent(requestId)) return
        setThreads(data)
        if (options?.selectLatest) {
          const latest = data[0]
          if (latest) {
            await loadThreadMessages(latest.id, requestId)
            if (requests.isCurrent(requestId)) {
              setCurrentThreadId(latest.id)
            }
          } else {
            setCurrentThreadId(null)
            onClearAgent()
          }
        }
      } catch (error) {
        console.error('Failed to load agent threads', error)
      } finally {
        if (requests.isCurrent(requestId)) {
          setThreadsLoading(false)
        }
      }
    },
    [agentId, onClearAgent, loadThreadMessages, requests]
  )

  const selectThread = useCallback(
    async (threadId: string) => {
      if (isLoading || threadId === currentThreadIdRef.current) return
      await loadThreadMessages(threadId)
    },
    [isLoading, loadThreadMessages]
  )

  const beginRenameThread = useCallback(
    (thread: AgentThread) => {
      setThreadToRename(thread)
      setRenameThreadTitle(voiceTitle(thread.title))
    },
    [voiceTitle]
  )

  const confirmRenameThread = useCallback(async () => {
    if (!threadToRename) return
    const nextTitle = renameThreadTitle.trim()
    if (!nextTitle) return
    setIsRenamingThread(true)
    try {
      await agentService.updateThread(threadToRename.id, { title: nextTitle })
      await loadThreads()
      setThreadToRename(null)
      setRenameThreadTitle('')
    } finally {
      setIsRenamingThread(false)
    }
  }, [loadThreads, renameThreadTitle, threadToRename])

  const beginDeleteThread = useCallback((thread: AgentThread) => {
    setThreadToDelete(thread)
  }, [])

  const confirmDeleteThread = useCallback(async () => {
    if (!threadToDelete) return
    setIsDeletingThread(true)
    try {
      await agentService.deleteThread(threadToDelete.id)
      setThreads(prev => prev.filter(thread => thread.id !== threadToDelete.id))
      const deletedCurrent = threadToDelete.id === currentThreadIdRef.current
      if (deletedCurrent) {
        setCurrentThreadId(null)
        onCurrentThreadDeleted()
      }
      await loadThreads({ selectLatest: deletedCurrent })
      setThreadToDelete(null)
    } finally {
      setIsDeletingThread(false)
    }
  }, [loadThreads, onCurrentThreadDeleted, threadToDelete])

  const invalidateRequests = useCallback(() => {
    requests.invalidate()
  }, [requests])

  return {
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
  }
}
