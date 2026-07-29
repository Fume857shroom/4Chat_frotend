import { ref } from 'vue'
import { defineStore } from 'pinia'
import { sendMessage as apiSendMessage, fetchHistory as apiFetchHistory } from '../api/message'
import type { MessageDisplay, MessageItem } from '../api/message'

const HISTORY_LIMIT = 20
const SSE_RECONNECT_DELAY = 3000

export const useMessageStore = defineStore('message', () => {
  // --- State ---
  const messageList = ref<MessageDisplay[]>([])
  const hasMoreHistory = ref(true)
  const isSending = ref(false)
  const loadingHistory = ref(false)
  let eventSource: EventSource | null = null

  // --- Actions ---

  function connectEventSource() {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return
    }

    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    const url = `${baseURL}/api/v1/messages/stream?token=${token}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as MessageItem
        const list = messageList.value

        // Deduplication: skip if last item has same id
        if (list.length > 0 && list[list.length - 1].id === data.id) {
          return
        }

        messageList.value = [...list, { ...data, _state: 'sent' }]
      } catch {
        // ignore malformed SSE data
      }
    }

    es.onerror = () => {
      es.close()
      eventSource = null

      // Auto-reconnect after delay
      setTimeout(() => {
        connectEventSource()
      }, SSE_RECONNECT_DELAY)
    }

    eventSource = es
  }

  function disconnect() {
    if (eventSource !== null) {
      eventSource.close()
      eventSource = null
    }
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
      createdAt: new Date().toISOString(),
      sender: { id: '', username: '' },
      _state: 'sending',
      _tempId: tempId,
    }

    messageList.value = [...messageList.value, optimistic]

    try {
      const real = await apiSendMessage(content)
      messageList.value = messageList.value.map((m) =>
        m._tempId === tempId
          ? { ...real, _state: 'sent' as const }
          : m,
      )
    } catch {
      messageList.value = messageList.value.map((m) =>
        m._tempId === tempId
          ? { ...m, _state: 'failed' as const }
          : m,
      )
    } finally {
      isSending.value = false
    }
  }

  async function retryMessage(tempId: string) {
    const target = messageList.value.find((m) => m._tempId === tempId)

    if (!target) {
      return
    }

    // Mark as sending
    messageList.value = messageList.value.map((m) =>
      m._tempId === tempId
        ? { ...m, _state: 'sending' as const }
        : m,
    )

    try {
      const real = await apiSendMessage(target.content)
      messageList.value = messageList.value.map((m) =>
        m._tempId === tempId
          ? { ...real, _state: 'sent' as const }
          : m,
      )
    } catch {
      messageList.value = messageList.value.map((m) =>
        m._tempId === tempId
          ? { ...m, _state: 'failed' as const }
          : m,
      )
    }
  }

  async function loadMoreHistory() {
    if (!hasMoreHistory.value || loadingHistory.value) {
      return
    }

    loadingHistory.value = true

    const cursor = messageList.value.length > 0 ? messageList.value[0].id : undefined

    try {
      const data = await apiFetchHistory(cursor, HISTORY_LIMIT)

      if (data.items.length === 0 || data.items.length < HISTORY_LIMIT) {
        hasMoreHistory.value = false
      }

      const historyItems: MessageDisplay[] = data.items.map((item) => ({
        ...item,
        _state: 'sent' as const,
      }))

      messageList.value = [...historyItems, ...messageList.value]
    } catch {
      console.error('[message] 加载历史消息失败')
    } finally {
      loadingHistory.value = false
    }
  }

  return {
    // state
    messageList,
    hasMoreHistory,
    isSending,
    loadingHistory,
    // actions
    connectEventSource,
    disconnect,
    sendMessage,
    retryMessage,
    loadMoreHistory,
  }
})
