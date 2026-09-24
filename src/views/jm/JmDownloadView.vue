<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  submitDownloadBatch,
  getTask,
  getHistory,
  zipDirectUrl,
  type JmTask,
  type JmHistoryItem,
} from '../../api/jm/download'
import { showToast } from '../../composables/toast'

// 批量队列：idsText 支持空格/逗号/顿号/换行分隔；提交后各 taskId 并行轮询
// 提交成功即清空输入，用户无需等待即可继续输入下一批（后端 MAX_CONCURRENT=3 自动排队）
const idsText = ref('')
const tasks = ref<JmTask[]>([])
const submitting = ref(false)
const errorMsg = ref('')
const history = ref<JmHistoryItem[]>([])
const timers = new Map<string, number>()

// 解析输入 → 纯数字校验 + 本地去重
function parseIds(raw: string): string[] {
  const parts = raw
    .split(/[\s,，、]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
  return [...new Set(parts)]
}

// 整体队列概览（后端在每个 task 上回传全局 running_count/queue_length，取最大值即可）
const overview = computed(() => {
  let running = 0
  let queue = 0
  for (const t of tasks.value) {
    running = Math.max(running, t.running_count || 0)
    queue = Math.max(queue, t.queue_length || 0)
  }
  return { running, queue }
})

function stopTimer(taskId: string) {
  const id = timers.get(taskId)
  if (id !== undefined) {
    clearInterval(id)
    timers.delete(taskId)
  }
}

function stopAllTimers() {
  for (const taskId of [...timers.keys()]) stopTimer(taskId)
}

async function pollOne(taskId: string) {
  try {
    const t = await getTask(taskId)
    const i = tasks.value.findIndex((x) => x.task_id === taskId)
    if (i >= 0) tasks.value[i] = t
    if (t.status === 'done' || t.status === 'failed') {
      stopTimer(taskId)
      await loadHistory()
    }
  } catch {
    stopTimer(taskId) // 查询失败即停，避免死循环
  }
}

async function startBatch() {
  errorMsg.value = ''
  const albumIds = parseIds(idsText.value)
  if (albumIds.length === 0) {
    errorMsg.value = '请输入至少一个有效漫画 ID（纯数字）'
    return
  }
  if (albumIds.length > 100) {
    errorMsg.value = '单次最多提交 100 本'
    return
  }
  submitting.value = true
  try {
    const { tasks: submitted } = await submitDownloadBatch(albumIds)
    // 占位初始化，再逐个轮询回填真实状态/进度/排队位置
    const placeholders: JmTask[] = submitted.map((s) => ({
      task_id: s.taskId,
      album_id: s.albumId,
      status: 'queued',
      error: null,
      progress: { photo_done: 0, photo_total: 0, image_done: 0, image_total: 0 },
      album: null,
      queue_position: null,
      running_count: 0,
      queue_length: 0,
    }))
    // 合并进现有列表（保留仍在跑的旧批次），按 task_id 去重
    const rest = tasks.value.filter((t) => !placeholders.some((p) => p.task_id === t.task_id))
    tasks.value = [...placeholders, ...rest]
    idsText.value = '' // 提交成功即清空，方便马上输入下一批
    for (const s of submitted) {
      await pollOne(s.taskId) // 立即查一次（已下载的会秒回 done）
      const cur = tasks.value.find((x) => x.task_id === s.taskId)
      // 仅对未完成任务建定时器，防止给已 done 的任务空转
      if (cur && cur.status !== 'done' && cur.status !== 'failed' && !timers.has(s.taskId)) {
        timers.set(s.taskId, window.setInterval(() => pollOne(s.taskId), 2000))
      }
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '批量提交失败'
  } finally {
    submitting.value = false
  }
}

// 交给浏览器原生下载（隐藏 iframe，不跳页、无 axios 超时）；仅 status==='done' 可点
function handleZip(id: string) {
  errorMsg.value = ''
  const frame = document.createElement('iframe')
  frame.style.display = 'none'
  frame.src = zipDirectUrl(String(id))
  document.body.appendChild(frame)
  // 响应头到达后下载即由浏览器下载管理器接管，稍后清理该隐藏节点
  window.setTimeout(() => frame.remove(), 60000)
  showToast('已开始下载，进度请在浏览器下载列表查看')
}

async function loadHistory() {
  try {
    const res = await getHistory(1, 30)
    history.value = res.list
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '获取历史失败'
  }
}

function labelOf(t: JmTask): string {
  if (t.status === 'queued') return t.queue_position ? `排队中 · 第 ${t.queue_position} 位` : '排队中'
  if (t.status === 'downloading') return '下载中'
  if (t.status === 'done') return '已完成'
  if (t.status === 'failed') return '失败'
  return ''
}

function percentOf(t: JmTask): number {
  const p = t.progress
  return p && p.image_total ? Math.min(100, Math.round((p.image_done / p.image_total) * 100)) : 0
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(loadHistory)
onUnmounted(stopAllTimers)
</script>

<template>
  <div class="jm-download">
    <header class="jm-download__head">
      <h3 class="jm-download__title">漫画下载</h3>
      <p class="jm-download__subtitle">
        可一次输入多个本子 ID（空格 / 逗号 / 换行分隔），提交后自动排队下载，无需等待即可继续添加
      </p>
    </header>

    <!-- 批量输入区 -->
    <div class="jm-input-col">
      <textarea
        v-model="idsText"
        class="jm-textarea"
        rows="3"
        spellcheck="false"
        placeholder="输入漫画 ID（纯数字），可一次多个，如：350234 123456 789012"
        @keydown.ctrl.enter.prevent="startBatch"
      ></textarea>
      <div class="jm-input-actions">
        <span class="jm-hint">Ctrl + Enter 快速提交 · 单次最多 100 本</span>
        <button class="jm-btn jm-btn--primary" :disabled="submitting" @click="startBatch">
          {{ submitting ? '提交中…' : '下载' }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="jm-error">{{ errorMsg }}</p>

    <!-- 队列概览 -->
    <div v-if="tasks.length" class="jm-queue-bar">
      <span>本次 {{ tasks.length }} 本</span>
      <span class="jm-dot">·</span>
      <span>服务器正在下载 {{ overview.running }} 本</span>
      <span class="jm-dot">·</span>
      <span>排队 {{ overview.queue }} 本</span>
    </div>

    <!-- 任务列表 -->
    <section v-if="tasks.length" class="jm-tasks">
      <article v-for="t in tasks" :key="t.task_id" class="jm-task">
        <div class="jm-task__head">
          <span class="jm-task__id">ID: {{ t.album_id }}</span>
          <span :class="['jm-badge', `jm-badge--${t.status}`]">{{ labelOf(t) }}</span>
        </div>
        <div class="jm-bar">
          <div class="jm-bar__fill" :style="{ width: percentOf(t) + '%' }"></div>
        </div>
        <div class="jm-task__meta">
          <template v-if="t.status === 'failed'">{{ t.error || '下载失败' }}</template>
          <template v-else-if="t.status === 'queued'">等待服务器调度…</template>
          <template v-else>
            图片 {{ t.progress.image_done }}/{{ t.progress.image_total }} · 章节
            {{ t.progress.photo_done }}/{{ t.progress.photo_total }}
          </template>
        </div>
        <button
          v-if="t.status === 'done'"
          class="jm-btn jm-btn--success"
          @click="handleZip(t.album_id)"
        >
          下载 ZIP
        </button>
      </article>
    </section>

    <!-- 历史区 -->
    <section class="jm-history">
      <h4 class="jm-history__title">我的下载历史</h4>
      <ul v-if="history.length" class="jm-history__list">
        <li v-for="h in history" :key="h.id" class="jm-history__item">
          <div class="jm-history__info">
            <span class="jm-history__name">{{ h.title || '(未命名)' }}</span>
            <span class="jm-history__sub">
              ID {{ h.albumId }} · {{ h.status }} · {{ formatTime(h.createdAt) }}
            </span>
          </div>
          <button
            class="jm-btn jm-btn--ghost"
            :disabled="h.status !== 'done'"
            @click="handleZip(h.albumId)"
          >
            下载 ZIP
          </button>
        </li>
      </ul>
      <p v-else class="jm-empty-tip">暂无下载记录</p>
    </section>
  </div>
</template>

<style scoped>
.jm-download {
  height: 100%;
  overflow: auto;
  padding: 4px 8px 24px;
}

.jm-download__head {
  margin-bottom: 18px;
}

.jm-download__title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--cyan), var(--pink));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.jm-download__subtitle {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

/* --- 批量输入区 --- */
.jm-input-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jm-textarea {
  width: 100%;
  min-height: 76px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.jm-textarea:focus {
  border-color: rgba(0, 240, 255, 0.7);
  box-shadow: 0 0 0 4px rgba(0, 240, 255, 0.12);
}

.jm-textarea::placeholder {
  color: var(--muted);
}

.jm-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.jm-hint {
  color: var(--muted);
  font-size: 12px;
}

/* --- 按钮 --- */
.jm-btn {
  padding: 12px 20px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    background-color 0.2s,
    opacity 0.2s;
}

.jm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.jm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.jm-btn--primary {
  color: #04121a;
  background: linear-gradient(135deg, var(--cyan), #4dd6ff);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.24);
}

.jm-btn--success {
  margin-top: 12px;
  color: #06140c;
  background: linear-gradient(135deg, #6ee7a8, #22c55e);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.22);
}

.jm-btn--ghost {
  color: var(--text);
  border-color: var(--line);
  background: var(--panel-soft);
}

.jm-btn--ghost:hover:not(:disabled) {
  border-color: rgba(0, 240, 255, 0.4);
}

/* --- 错误提示 --- */
.jm-error {
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 13px;
  color: #ffd7de;
  border: 1px solid rgba(255, 45, 85, 0.4);
  border-radius: var(--radius-md);
  background: rgba(255, 45, 85, 0.1);
}

/* --- 队列概览 --- */
.jm-queue-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--panel-soft);
  color: var(--muted);
  font-size: 13px;
}

.jm-dot {
  opacity: 0.5;
}

/* --- 任务列表 --- */
.jm-tasks {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.jm-task {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.05), transparent 40%),
    var(--panel-strong);
}

.jm-task__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text);
}

.jm-task__id {
  font-weight: 600;
}

.jm-task__meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

/* --- 状态徽标 --- */
.jm-badge {
  padding: 3px 10px;
  font-size: 12px;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.jm-badge--queued {
  color: var(--yellow);
  border-color: rgba(255, 228, 92, 0.4);
}

.jm-badge--downloading {
  color: var(--cyan);
  border-color: rgba(0, 240, 255, 0.4);
}

.jm-badge--done {
  color: #6ee7a8;
  border-color: rgba(34, 197, 94, 0.45);
}

.jm-badge--failed {
  color: #ff8fa3;
  border-color: rgba(255, 45, 85, 0.45);
}

/* --- 进度条 --- */
.jm-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.jm-bar__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--cyan), var(--pink));
  transition: width 0.3s ease;
}

/* --- 历史区 --- */
.jm-history {
  margin-top: 26px;
}

.jm-history__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
}

.jm-history__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.jm-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--panel-soft);
}

.jm-history__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.jm-history__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jm-history__sub {
  font-size: 12px;
  color: var(--muted);
}

.jm-empty-tip {
  color: var(--muted);
  font-size: 13px;
}
</style>
