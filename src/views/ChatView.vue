<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import ChatComposer from '../components/ChatComposer.vue'
import InfoPanel from '../components/InfoPanel.vue'
import OnlineUsers from '../components/OnlineUsers.vue'
import { useMessageStore } from '../stores/message'
import { useAuthStore } from '../stores/auth'

const store = useMessageStore()
const authStore = useAuthStore()

const draft = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
const hasNewMessage = ref(false)
const userScrolledUp = ref(false)
let observer: IntersectionObserver | null = null

// --- Scroll helpers ---

const isNearBottom = computed(() => {
  const el = scrollRef.value
  if (!el) {
    return true
  }
  return el.scrollHeight - el.scrollTop - el.clientHeight < 150
})

function scrollToBottom(smooth = true) {
  hasNewMessage.value = false
  userScrolledUp.value = false

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

  const nearBottom = isNearBottom.value
  userScrolledUp.value = !nearBottom

  if (nearBottom) {
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
  () => store.messages.length,
  () => {
    if (isNearBottom.value) {
      scrollToBottom(true)
    } else {
      hasNewMessage.value = true
    }
  },
)

// --- Lifecycle ---

onMounted(async () => {
  store.connectEventSource()
  await store.loadInitialMessages()
  scrollToBottom(false)
  nextTick(() => {
    setupIntersectionObserver()
  })
})

onUnmounted(() => {
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

      <InfoPanel title="公告" accent="#ff2d55">
        <div class="notice-card">
          <p>本周优先完善聊天流与消息展示，后续将补充媒体上传与会话列表。</p>
        </div>
      </InfoPanel>

      <InfoPanel title="媒体库" accent="#ffe45c">
        <ul class="media-list">
          <li v-for="item in ['封面图.psd', '聊天图.png', '活动海报.fig']" :key="item">{{ item }}</li>
        </ul>
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
        有新消息
      </div>

      <ChatComposer v-model="draft" :disabled="store.isSending" @submit="handleSend" />
    </div>
  </section>
</template>
