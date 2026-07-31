<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import ChatComposer from '../components/ChatComposer.vue'
import InfoPanel from '../components/InfoPanel.vue'
import OnlineUsers from '../components/OnlineUsers.vue'
import CreateAnnounceDialog from '../components/CreateAnnounceDialog.vue'
import { useMessageStore } from '../stores/message'
import { useAuthStore } from '../stores/auth'
import { useAnnounceStore } from '../stores/announce'
import { requestNotifyPermission, resetUnread } from '../composables/notification'

const store = useMessageStore()
const authStore = useAuthStore()
const announceStore = useAnnounceStore()

const showCreateDialog = ref(false)

const draft = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
const hasNewMessage = ref(false)
let observer: IntersectionObserver | null = null

// --- Scroll helpers ---

// 注意：不能使用 computed —— scrollTop/scrollHeight 是 DOM 属性，非响应式，
// computed 会缓存旧值导致“翻历史时新消息到来仍判断为在底部”的 bug。
function isNearBottom(): boolean {
  const el = scrollRef.value
  if (!el) {
    return true
  }
  return el.scrollHeight - el.scrollTop - el.clientHeight < 150
}

function scrollToBottom(smooth = true) {
  resetUnread()
  hasNewMessage.value = false

  nextTick(() => {
    const el = scrollRef.value
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
    }
  })
}

function handleScroll() {
  const el = scrollRef.value
  if (!el) {
    return
  }

  if (isNearBottom()) {
    hasNewMessage.value = false
  }
}

// --- IntersectionObserver for top sentinel ---

function setupIntersectionObserver() {
  if (!scrollRef.value || !sentinelRef.value) {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry || !entry.isIntersecting) {
        return
      }
      if (!store.hasMore || store.isLoadingHistory) {
        return
      }

      const el = scrollRef.value
      if (!el) {
        return
      }

      const oldScrollHeight = el.scrollHeight
      store.loadMoreHistory().then(() => {
        nextTick(() => {
          if (scrollRef.value) {
            scrollRef.value.scrollTop = scrollRef.value.scrollHeight - oldScrollHeight
          }
        })
      })
    },
    { root: scrollRef.value, threshold: 0 },
  )

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value)
  }
}

// --- Message actions ---

function handleSend() {
  if (!draft.value) {
    return
  }

  const text = draft.value
  draft.value = ''

  store.sendMessage(text)
}

function retryMessage(tempId: string) {
  store.retryMessage(tempId)
}

function isOwnMessage(msg: { _tempId?: string; sender?: { id: string; username: string } }): boolean {
  if (msg._tempId) {
    return true
  }
  if (authStore.user?.username && msg.sender) {
    return msg.sender.username === authStore.user.username
  }
  return false
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const hhmm = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    if (msgDate.getTime() === today.getTime()) {
      return hhmm
    }

    if (msgDate.getTime() === yesterday.getTime()) {
      return `昨天 ${hhmm}`
    }

    const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (d.getFullYear() === now.getFullYear()) {
      return `${mmdd} ${hhmm}`
    }

    return `${d.getFullYear()}-${mmdd} ${hhmm}`
  } catch {
    return ''
  }
}

// --- Auto scroll on new messages ---

watch(
  () => store.messages[store.messages.length - 1]?.id ?? '',
  () => {
    if (isNearBottom()) {
      scrollToBottom(true)
    } else {
      hasNewMessage.value = true
    }
  },
)

// --- Lifecycle ---

function handleVisibilityChange() {
  if (!document.hidden) {
    resetUnread()
  }
}

function handleWindowFocus() {
  resetUnread()
}

onMounted(async () => {
  requestNotifyPermission()
  window.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleWindowFocus)
  store.connectEventSource()
  await store.loadInitialMessages()
  scrollToBottom(false)
  announceStore.fetchAnnounces()
  nextTick(() => {
    setupIntersectionObserver()
  })
})

onUnmounted(() => {
  window.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleWindowFocus)
  if (observer) {
    observer.disconnect()
    observer = null
  }
  store.disconnect()
})
</script>

<template>
  <section class="chat-page">
    <aside class="chat-page__meta">
      <OnlineUsers />

      <InfoPanel
        title="公告"
        accent="#ff2d55"
        :items="announceStore.list"
        :loading="announceStore.loading"
        :error="announceStore.error"
      />

      <InfoPanel title="媒体库" accent="#ffe45c">
        <p class="info-panel__placeholder">正在开发</p>
      </InfoPanel>
    </aside>

    <div class="chat-room">

      <div
        ref="scrollRef"
        class="chat-room__messages"
        @scroll="handleScroll"
      >
        <!-- Sentinel element for IntersectionObserver -->
        <div ref="sentinelRef" class="chat-room__sentinel"></div>

        <!-- Spacer: push messages to bottom when space allows -->
        <div class="chat-room__spacer"></div>

        <!-- History loading indicator -->
        <div v-if="store.isLoadingHistory" class="history-loading">
          加载历史消息...
        </div>

        <!-- History load error with retry -->
        <div v-else-if="store.historyLoadError" class="history-error">
          {{ store.historyLoadError }}
          <button @click="store.retryLoadHistory()">点击重试</button>
        </div>

        <!-- No more history hint -->
        <div v-else-if="!store.hasMore && store.messages.length > 0" class="history-loading history-loading--done">
          已加载全部消息
        </div>

        <article
          v-for="message in store.messages"
          :key="message.id"
          class="message-card"
          :class="{
            'message-card--own': isOwnMessage(message),
            'message-card--sending': message._state === 'sending',
            'message-card--failed': message._state === 'failed',
          }"
        >
          <header>
            <strong>{{ message.sender?.username || '我' }}</strong>
            <time>{{ formatTime(message.createdAt) }}</time>
            <!-- Sending spinner -->
            <span v-if="message._state === 'sending'" class="message-card__status message-card__status--sending"></span>
            <!-- Retry button -->
            <button
              v-if="message._state === 'failed' && message._tempId"
              class="message-card__retry"
              title="重新发送"
              @click="retryMessage(message._tempId!)"
            >
              重试
            </button>
          </header>
          <p>{{ message.content }}</p>
        </article>
      </div>

      <!-- New message notification -->
      <div
        v-if="hasNewMessage"
        class="new-message-hint"
        @click="scrollToBottom(true)"
      >
        <span class="new-message-hint__arrow">↓</span>
        有新消息
      </div>

      <ChatComposer v-model="draft" :disabled="store.isSending" @submit="handleSend" @announce="showCreateDialog = true" />

      <CreateAnnounceDialog
        v-if="showCreateDialog"
        @success="showCreateDialog = false"
        @close="showCreateDialog = false"
      />
    </div>
  </section>
</template>
