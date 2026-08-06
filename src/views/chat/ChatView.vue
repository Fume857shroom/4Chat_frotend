<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import ChatComposer from '../../components/chat/ChatComposer.vue'
import InfoPanel from '../../components/InfoPanel.vue'
import OnlineUsers from '../../components/chat/OnlineUsers.vue'
import MediaLibrary from '../../components/chat/MediaLibrary.vue'
import FilePreview from '../../components/chat/FilePreview.vue'
import CreateAnnounceDialog from '../../components/chat/CreateAnnounceDialog.vue'
import { useMessageStore } from '../../stores/chat/message'
import type { FileInfo } from '../../api/chat/message'
import { fileUrlOf, formatFileSize, fileIconOf, isImageExt, downloadFile } from '../../composables/file'
import { useAuthStore } from '../../stores/auth'
import { useAnnounceStore } from '../../stores/chat/announce'
import { requestNotifyPermission, resetUnread } from '../../composables/notification'
import { showToast } from '../../composables/toast'
import { useUserStore } from '../../stores/user'
import { resolveAvatarUrl, avatarHue } from '../../composables/avatar'

const store = useMessageStore()
const authStore = useAuthStore()
const announceStore = useAnnounceStore()
const userStore = useUserStore()

const showCreateDialog = ref(false)

const draft = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
const hasNewMessage = ref(false)
let observer: IntersectionObserver | null = null

// --- Scroll helpers ---

// 注意：不能使用 computed —— scrollTop/scrollHeight 是 DOM 属性，非响应式，
// computed 会缓存旧值导致"翻历史时新消息到来仍判断为在底部"的 bug。
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

// 前端文件大小限制（后端暂无限制，文档建议前端先行限制；500MB 内不误伤大视频）
const MAX_FILE_SIZE = 500 * 1024 * 1024

// 发送文件：上传成功后消息列表追加文件消息，失败 toast 提示
async function handleSendFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    showToast('文件超过 500MB，无法上传')
    return
  }
  const ok = await store.sendFile(file)
  showToast(ok ? '文件已发送' : '文件发送失败')
  if (ok) {
    scrollToBottom(true)
  }
}

// 图片查看器状态（聊天页与媒体库共用 FilePreview 组件）
const previewVisible = ref(false)
const previewFile = ref<{ url: string; name: string; size: string } | null>(null)

function openPreview(file: FileInfo) {
  previewFile.value = {
    url: fileUrlOf(file.url),
    name: file.name,
    size: formatFileSize(file.size),
  }
  previewVisible.value = true
}

// 非图片文件：blob 下载到本地（跨域 download 属性无效，见 composables/file）
async function onDownloadFile(file: FileInfo) {
  const ok = await downloadFile(fileUrlOf(file.url), file.name)
  if (!ok) {
    showToast('下载失败，已在新窗口打开')
  }
}

function retryMessage(tempId: string) {
  store.retryMessage(tempId)
}

function isOwnMessage(msg: { _tempId?: string; sender?: { id: number; username: string } }): boolean {
  if (msg._tempId) {
    return true
  }
  if (authStore.user?.username && msg.sender) {
    return msg.sender.username === authStore.user.username
  }
  return false
}

// 自己的消息优先显示个人中心设置的新昵称
function displayNameOf(msg: { _tempId?: string; sender?: { id: number; username: string } }): string {
  if (isOwnMessage(msg)) {
    return userStore.profile?.nickname || msg.sender?.username || '我'
  }
  return msg.sender?.username || '未知用户'
}

// --- Avatar helpers ---

type MessageLike = { _tempId?: string; sender?: { id: number; username: string; avatar?: string } }

// 头像 URL：自己的临时消息（sender 无 avatar）用个人中心头像兜底
function avatarOf(message: MessageLike): string {
  if (isOwnMessage(message) && !message.sender?.avatar) {
    return resolveAvatarUrl(userStore.profile?.avatar)
  }
  return resolveAvatarUrl(message.sender?.avatar)
}

// 无头像时的占位符首字符
function avatarTextOf(message: MessageLike): string {
  if (isOwnMessage(message)) {
    return (userStore.profile?.nickname || '我').charAt(0)
  }
  return (message.sender?.username || '?').charAt(0)
}

// 无头像时的占位符背景：按用户 id 哈希取色，同一用户颜色恒定
function avatarStyleOf(message: MessageLike): Record<string, string> | undefined {
  if (avatarOf(message)) {
    return undefined
  }
  const hue = isOwnMessage(message)
    ? avatarHue(authStore.user?.id ?? 'me')
    : avatarHue(message.sender?.id ?? 'guest')
  return {
    background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
  }
}

// 智能日期：今天 / 昨天 / MM-DD / YYYY-MM-DD
function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (msgDate.getTime() === today.getTime()) {
      return '今天'
    }

    if (msgDate.getTime() === yesterday.getTime()) {
      return '昨天'
    }

    const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (d.getFullYear() === now.getFullYear()) {
      return mmdd
    }

    return `${d.getFullYear()}-${mmdd}`
  } catch {
    return ''
  }
}

// 时间：恒定 HH:mm
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
  const perm = requestNotifyPermission()
  if (perm === 'denied') {
    showToast('通知权限被拒绝，新消息将仅通过标题提示')
  } else if (perm === 'unsupported') {
    showToast('当前环境不支持系统通知（需 HTTPS）')
  }
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

      <MediaLibrary />
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

        <!-- 消息行：头像 + 气泡（自己 / 他人镜像对称） -->
        <div
          v-for="message in store.messages"
          :key="message.id"
          class="message-row"
          :class="{ 'message-row--own': isOwnMessage(message) }"
          style="width: 100%"
        >
          <!-- 头像：有图显示图片，无图显示首字符占位符 -->
          <span
            class="message-avatar"
            :class="{ 'message-avatar--placeholder': !avatarOf(message) }"
            :style="avatarStyleOf(message)"
          >
            <img v-if="avatarOf(message)" :src="avatarOf(message)" alt="" />
            <template v-else>{{ avatarTextOf(message) }}</template>
          </span>

          <div class="message-body">
            <!-- 用户名：气泡外上方，紧贴气泡左对齐 -->
            <span class="message-body__name">{{ displayNameOf(message) }}</span>

            <article
              class="message-card"
              :class="{
                'message-card--own': isOwnMessage(message),
                'message-card--sending': message._state === 'sending',
                'message-card--failed': message._state === 'failed',
              }"
            >
              <!-- 文件消息：图片直接渲染缩略图（点击开查看器），其他类型文件卡片（点击下载） -->
              <template v-if="message.type === 'FILE' && message.file">
                <img
                  v-if="isImageExt(message.file.extension)"
                  class="message-image"
                  :src="fileUrlOf(message.file.url)"
                  :alt="message.file.name"
                  :title="message.file.name"
                  @click="openPreview(message.file)"
                />
                <a
                  v-else
                  class="message-file"
                  :title="message.file.name"
                  @click.prevent="onDownloadFile(message.file)"
                >
                  <span class="message-file__icon">{{ fileIconOf(message.file.extension) }}</span>
                  <span class="message-file__meta">
                    <span class="message-file__name">{{ message.file.name }}</span>
                    <span class="message-file__size">{{ formatFileSize(message.file.size) }}</span>
                  </span>
                  <span class="message-file__download">⬇</span>
                </a>
                <p v-if="message.content">{{ message.content }}</p>
              </template>
              <p v-else>{{ message.content }}</p>
            </article>

            <!-- 时间：气泡同一行右外侧，紧贴气泡右边界（自己：左外侧） -->
            <div class="message-body__meta">
              <span class="message-body__date">{{ formatDate(message.createdAt) }}</span>
              <span class="message-body__time">
                {{ formatTime(message.createdAt) }}
                <span v-if="message._state === 'sending'" class="message-card__status message-card__status--sending"></span>
              </span>
              <button
                v-if="message._state === 'failed' && message._tempId"
                class="message-card__retry"
                title="重新发送"
                @click="retryMessage(message._tempId!)"
              >
                重试
              </button>
            </div>
          </div>
        </div>
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

      <ChatComposer
        v-model="draft"
        :disabled="store.isSending"
        @submit="handleSend"
        @file="handleSendFile"
        @announce="showCreateDialog = true"
      />

      <CreateAnnounceDialog
        v-if="showCreateDialog"
        @success="showCreateDialog = false"
        @close="showCreateDialog = false"
      />

      <FilePreview
        :visible="previewVisible"
        :url="previewFile?.url ?? ''"
        :name="previewFile?.name"
        :size="previewFile?.size"
        @close="previewVisible = false"
      />
    </div>
  </section>
</template>

<style scoped>
.chat-page {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 7fr);
  gap: 24px;
  height: 100%;
  overflow: hidden;
}

.chat-page__meta {
  display: grid;
  gap: 16px;
}

.chat-room {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.04), transparent 18%),
    linear-gradient(0deg, rgba(255, 45, 85, 0.04), transparent 22%),
    var(--panel);
  box-shadow: var(--shadow);
}

/* --- 遗留：当前模板未使用的 header/tag 样式 --- */
.chat-room__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 18px;
  border-bottom: 1px solid var(--line);
}

.chat-room__header h1 {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-room__tag {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.04);
}

.chat-room__messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 24px 80px 24px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  /* 滚动条透明：轨道不可见，滑块半透明 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.chat-room__messages::-webkit-scrollbar {
  width: 6px;
}

.chat-room__messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-room__messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.chat-room__messages::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* --- 消息行：头像 + 气泡 --- */
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
}

.message-row--own {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  flex-shrink: 0;
  overflow: hidden;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.message-avatar--placeholder {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  font-weight: 600;
}

/* --- 消息主体容器：用户名 / 气泡 / 时间 --- */
.message-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
  max-width: min(60%, 460px);
}

.message-row--own .message-body {
  align-items: flex-end;
}

/* 用户名：气泡外上方，紧贴气泡左对齐 */
.message-body__name {
  margin-bottom: 2px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

/* --- 聊天气泡：长方形圆角条状 --- */
.message-card {
  width: fit-content;
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.message-card p {
  line-height: 1.6;
}

/* 时间：气泡同一行右外侧（自己：左外侧），紧贴气泡右边界 */
.message-body__meta {
  position: absolute;
  right: 0;
  bottom: 0;
  transform: translateX(calc(100% + 8px));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 10px;
  line-height: 1.4;
  white-space: nowrap;
}

.message-row--own .message-body__meta {
  left: 0;
  right: auto;
  transform: translateX(calc(-100% - 8px));
  align-items: flex-end;
}

.message-body__time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.message-card__status--sending {
  width: 8px;
  height: 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--cyan);
  border-radius: 50%;
  display: inline-block;
  animation: message-status-spin 0.8s linear infinite;
}

.message-card__retry {
  margin-top: 2px;
  padding: 2px 8px;
  border: 1px solid var(--pink);
  border-radius: 8px;
  background: rgba(255, 45, 85, 0.1);
  color: var(--pink);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

@keyframes message-status-spin {
  to {
    transform: rotate(360deg);
  }
}

/* --- 图片消息：直接渲染缩略图 --- */
.message-image {
  display: block;
  max-width: 260px;
  max-height: 220px;
  border-radius: 10px;
  cursor: zoom-in;
  transition: transform 0.2s;
}

.message-image:hover {
  transform: scale(1.02);
}

/* --- 文件消息卡片 --- */
.message-file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 210px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s;
}

.message-file:hover {
  border-color: rgba(0, 240, 255, 0.4);
}

.message-file__icon {
  font-size: 22px;
  flex-shrink: 0;
}

.message-file__meta {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.message-file__name {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-file__size {
  font-size: 11px;
  color: var(--muted);
}

.message-file__download {
  flex-shrink: 0;
  color: var(--cyan);
  font-size: 14px;
}

/* --- 文件消息的描述文本 --- */
.message-card p {
  margin-top: 6px;
}

.message-card > p:first-child {
  margin-top: 0;
}

.message-card--own {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.12));
}

/* --- Sentinel and Spacer --- */
.chat-room__sentinel {
  height: 1px;
  flex-shrink: 0;
}

.chat-room__spacer {
  flex: 1;
  min-height: 0;
}

/* --- History loading indicator --- */
.history-loading {
  text-align: center;
  padding: 8px 16px;
  color: var(--muted);
  font-size: 12px;
}

.history-loading--done {
  color: rgba(255, 255, 255, 0.25);
}

/* --- History load error with retry --- */
.history-error {
  text-align: center;
  padding: 16px;
  color: var(--pink);
  font-size: 13px;
}

.history-error button {
  margin-left: 8px;
  padding: 4px 12px;
  border: 1px solid var(--pink);
  border-radius: 8px;
  background: transparent;
  color: var(--pink);
  cursor: pointer;
}

.history-error button:hover {
  background: rgba(255, 45, 85, 0.1);
}

/* --- New message floating button --- */
.new-message-hint {
  position: absolute;
  left: 50%;
  bottom: 88px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 999px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.16), rgba(255, 45, 85, 0.14));
  color: var(--text);
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  animation: new-message-pop 0.25s ease;
  transition: transform 0.2s, box-shadow 0.2s;
}

.new-message-hint:hover {
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 10px 32px rgba(0, 240, 255, 0.25);
}

.new-message-hint__arrow {
  color: var(--cyan);
  font-weight: 700;
}

@keyframes new-message-pop {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 1100px) {
  .chat-page {
    grid-template-columns: 1fr;
  }

  .chat-page__meta > :not(:first-child) {
    display: none;
  }
}

@media (max-width: 720px) {
  .chat-room__header {
    flex-direction: column;
  }

  .message-card,
  .message-card--own {
    max-width: 100%;
  }
}
</style>