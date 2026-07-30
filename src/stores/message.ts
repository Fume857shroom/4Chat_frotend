import { ref } from 'vue'
import { defineStore } from 'pinia'
import { sendMessage as apiSendMessage, fetchHistory as apiFetchHistory } from '../api/message'
import type { MessageDisplay, MessageItem } from '../api/message'
import { useAuthStore } from './auth'

const INITIAL_LIMIT = 100
const INCREMENTAL_LIMIT = 50

export const useMessageStore = defineStore('message', () => {
  // --- State ---
  const messages = ref<MessageDisplay[]>([])
  const hasMore = ref(true)
  const isSending = ref(false)
  const isLoadingHistory = ref(false)
  const historyLoadError = ref<string | null>(null)
  let eventSource: EventSource | null = null

  // --- Actions ---

  function connectEventSource() {
    const token = localStorage.getItem('token')
    if (!token) {
      return
    }

    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    const url = `${baseURL}/api/v1/messages/stream?token=${token}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      if (!event.data) {
        return
      }

      try {
        const data = JSON.parse(event.data)

        // Ignore SSE connection confirmation
        if (data.type === 'connected') {
          return
        }

        // Filter out self-sent messages (broadcast by backend)
        const authStore = useAuthStore()
        if (authStore.user?.id && data.sender?.id === authStore.user.id) {
          return
        }

        const msg = data as MessageItem
        const list = messages.value

        // Deduplication: skip if last item has same id
        if (list.length > 0 && list[list.length - 1].id === msg.id) {
          return
        }

        messages.value = [...list, { ...msg, _state: 'sent' }]
      } catch {
        // ignore malformed SSE data
      }
    }

    es.onerror = () => {
      // EventSource built-in auto-reconnect, no manual handling needed
      console.warn('[message] SSE 连接异常，正在自动重连...')
    }

    eventSource = es
  }

  function disconnect() {
    if (eventSource !== null) {
      eventSource.close()
      eventSource = null
    }
  }

  async function loadInitialMessages() {
    isLoadingHistory.value = true
    historyLoadError.value = null

    try {
      const data = await apiFetchHistory(undefined, INITIAL_LIMIT)
      messages.value = data.messages.map((item) => ({
        ...item,
        _state: 'sent' as const,
      }))
      hasMore.value = data.hasMore
    } catch {
      historyLoadError.value = '初始消息加载失败'
      console.error('[message] 初始消息加载失败')
    } finally {
      isLoadingHistory.value = false
    }
  }

  async function loadMoreHistory() {
    if (!hasMore.value || isLoadingHistory.value) {
      return
    }

    isLoadingHistory.value = true
    historyLoadError.value = null

    const cursor = messages.value.length > 0 ? messages.value[0].id : undefined

    try {
      const data = await apiFetchHistory(cursor, INCREMENTAL_LIMIT)
      const historyItems: MessageDisplay[] = data.messages.map((item) => ({
        ...item,
        _state: 'sent' as const,
      }))
      messages.value = [...historyItems, ...messages.value]
      hasMore.value = data.hasMore
    } catch {
      historyLoadError.value = '历史消息加载失败'
      console.error('[message] 历史消息加载失败')
    } finally {
      isLoadingHistory.value = false
    }
  }

  function retryLoadHistory() {
    historyLoadError.value = null
    if (messages.value.length === 0) {
      return loadInitialMessages()
    }
    return loadMoreHistory()
  }

  function clearMessages() {
    messages.value = []
    hasMore.value = true
    isSending.value = false
    isLoadingHistory.value = false
    historyLoadError.value = null
    disconnect()
  }

  async function sendMessage(content: string) {
    if (isSending.value) {
      return
    }

    isSending.value = true

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const optimistic: MessageDisplay = {
      id: tempId,
      content,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
      sender: { id: '', username: '' },
      _state: 'sending',
      _tempId: tempId,
    }

    messages.value = [...messages.value, optimistic]

    try {
      const real = await apiSendMessage(content)
      messages.value = messages.value.map((m) =>
        m._tempId === tempId
          ? { ...real, _state: 'sent' as const }
          : m,
      )
    } catch {
      messages.value = messages.value.map((m) =>
        m._tempId === tempId
          ? { ...m, _state: 'failed' as const }
          : m,
      )
    } finally {
      isSending.value = false
    }
  }

  async function retryMessage(tempId: string) {
    const target = messages.value.find((m) => m._tempId === tempId)

    if (!target) {
      return
    }

    messages.value = messages.value.map((m) =>
      m._tempId === tempId
        ? { ...m, _state: 'sending' as const }
        : m,
    )

    try {
      const real = await apiSendMessage(target.content)
      messages.value = messages.value.map((m) =>
        m._tempId === tempId
          ? { ...real, _state: 'sent' as const }
          : m,
      )
    } catch {
      messages.value = messages.value.map((m) =>
        m._tempId === tempId
          ? { ...m, _state: 'failed' as const }
          : m,
      )
    }
  }

  function refreshLatestMessages() {
    const hadMessages = messages.value.length > 0

    if (!hadMessages) {
      return
    }

    ;(async () => {
      try {
        const data = await apiFetchHistory(undefined, 50)
        const freshMap = new Map<string, MessageDisplay>()

        for (const item of data.messages) {
          freshMap.set(item.id, { ...item, _state: 'sent' as const })
        }

        const merged = messages.value.filter((m) => !freshMap.has(m.id))

        for (const [, msg] of freshMap) {
          merged.push(msg)
        }

        merged.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )

        messages.value = merged
      } catch {
        console.warn('[message] 断线重连后刷新消息失败')
      }
    })()
  }

  return {
    // state
    messages,
    hasMore,
    isSending,
    isLoadingHistory,
    historyLoadError,
    // actions
    connectEventSource,
    disconnect,
    loadInitialMessages,
    loadMoreHistory,
    retryLoadHistory,
    clearMessages,
    sendMessage,
    retryMessage,
    refreshLatestMessages,
  }
})
