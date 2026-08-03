import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import router from '../../router'
import { useAuthStore } from '../auth'
import { fetchOnlineUsers as apiFetchOnlineUsers, sendHeartbeat as apiSendHeartbeat } from '../../api/chat/online'
import type { OnlineUser } from '../../api/chat/online'

const HEARTBEAT_INTERVAL_ACTIVE = 15_000
const HEARTBEAT_INTERVAL_HIDDEN = 20_000
const POLL_INTERVAL = 10_000
const MAX_HEARTBEAT_FAILURES = 3

export const useOnlineStore = defineStore('online', () => {
  // --- State ---
  const onlineUsers = ref<OnlineUser[]>([])
  const connectionStatus = ref<'connected' | 'connection_lost' | 'idle'>('idle')
  const heartbeatFailCount = ref(0)
  const isTabActive = ref(true)

  // Non-reactive timer handles stored as plain values to avoid ref overhead
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  // --- Getters ---
  const totalCount = computed(() => onlineUsers.value.length)

  // --- Timer helpers ---
  function clearTimers() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function startHeartbeatTimer(interval: number) {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
    }
    heartbeatTimer = setInterval(() => {
      sendHeartbeatAction()
    }, interval)
  }

  function startPollTimer() {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
    }
    pollTimer = setInterval(() => {
      fetchOnlineUsersAction()
    }, POLL_INTERVAL)
  }

  // --- Actions ---

  async function sendHeartbeatAction() {
    try {
      await apiSendHeartbeat()
      heartbeatFailCount.value = 0
      connectionStatus.value = 'connected'
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } }

      // 401: token expired or invalid
      if (axiosError.response?.status === 401) {
        handleTokenExpired()
        return
      }

      heartbeatFailCount.value++
      console.warn('[online] 心跳失败 (' + heartbeatFailCount.value + '/' + MAX_HEARTBEAT_FAILURES + '):', error)

      if (heartbeatFailCount.value >= MAX_HEARTBEAT_FAILURES) {
        connectionStatus.value = 'connection_lost'
        // pause polling while connection is lost
        if (pollTimer !== null) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      }
    }
  }

  async function fetchOnlineUsersAction() {
    if (connectionStatus.value !== 'connected') {
      return
    }

    try {
      const res = await apiFetchOnlineUsers()
      // Spec response shape: { code, data: OnlineUser[], total }
      onlineUsers.value = Array.isArray(res.data) ? res.data : []
    } catch (err) {
      console.error('[online] 获取在线用户列表失败:', err)
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      isTabActive.value = false
      startHeartbeatTimer(HEARTBEAT_INTERVAL_HIDDEN)
    } else {
      isTabActive.value = true
      startHeartbeatTimer(HEARTBEAT_INTERVAL_ACTIVE)
      // immediate heartbeat when returning to foreground
      sendHeartbeatAction()
    }
  }

  function handleOnline() {
    heartbeatFailCount.value = 0
    connectionStatus.value = 'connected'

    // restart polling if it was paused
    if (pollTimer === null) {
      startPollTimer()
    }

    // immediate heartbeat + list refresh
    startHeartbeatTimer(isTabActive.value ? HEARTBEAT_INTERVAL_ACTIVE : HEARTBEAT_INTERVAL_HIDDEN)
    sendHeartbeatAction()
    fetchOnlineUsersAction()
  }

  function handleOffline() {
    // do nothing special, heartbeat will naturally fail and trigger connection_lost
  }

  function handleTokenExpired() {
    clearTimers()
    onlineUsers.value = []
    connectionStatus.value = 'idle'
    heartbeatFailCount.value = 0

    const authStore = useAuthStore()
    authStore.logout()

    router.push({ name: 'login' })
  }

  function initOnlineService() {
    // Initial state
    isTabActive.value = !document.hidden
    connectionStatus.value = 'connected'
    heartbeatFailCount.value = 0

    // Start timers
    startHeartbeatTimer(isTabActive.value ? HEARTBEAT_INTERVAL_ACTIVE : HEARTBEAT_INTERVAL_HIDDEN)
    startPollTimer()

    // Immediate first heartbeat + list fetch
    sendHeartbeatAction()
    fetchOnlineUsersAction()

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  function destroyOnlineService() {
    clearTimers()

    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)

    onlineUsers.value = []
    connectionStatus.value = 'idle'
    heartbeatFailCount.value = 0
  }

  return {
    // state
    onlineUsers,
    connectionStatus,
    heartbeatFailCount,
    isTabActive,
    // getters
    totalCount,
    // actions
    initOnlineService,
    destroyOnlineService,
    handleVisibilityChange,
    sendHeartbeatAction,
    fetchOnlineUsersAction,
    handleTokenExpired,
  }
})