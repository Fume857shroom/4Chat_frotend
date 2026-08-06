<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FilePreview from '../../components/chat/FilePreview.vue'
import { fetchFiles } from '../../api/chat/message'
import type { MediaFile } from '../../api/chat/message'
import { fileUrlOf, formatFileSize, fileIconOf, isImageExt, downloadFile } from '../../composables/file'
import { showToast } from '../../composables/toast'

const PAGE_SIZE = 20

const router = useRouter()

// 类型分类 Tab：全部 + 六类（与扩展名分组规则一致）
const TABS = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'doc', label: '文档' },
  { key: 'archive', label: '压缩包' },
  { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' },
  { key: 'other', label: '其他' },
] as const

type TabKey = (typeof TABS)[number]['key']

const activeTab = ref<TabKey>('all')

const files = ref<MediaFile[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']
const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md']
const ARCHIVE_EXTS = ['zip', 'rar', '7z', 'tar', 'gz']
const VIDEO_EXTS = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']

function groupKeyOf(ext: string): string {
  const e = (ext || '').toLowerCase()
  if (IMAGE_EXTS.includes(e)) return 'image'
  if (DOC_EXTS.includes(e)) return 'doc'
  if (ARCHIVE_EXTS.includes(e)) return 'archive'
  if (VIDEO_EXTS.includes(e)) return 'video'
  if (AUDIO_EXTS.includes(e)) return 'audio'
  return 'other'
}

// 当前 Tab 展示的文件（在已加载列表内按类型过滤）
const visibleFiles = computed(() => {
  if (activeTab.value === 'all') {
    return files.value
  }
  return files.value.filter((f) => groupKeyOf(f.extension) === activeTab.value)
})

const hasMore = computed(() => files.value.length < total.value)

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  } catch {
    return ''
  }
}

async function loadMore() {
  if (loading.value) {
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await fetchFiles({ page: page.value + 1, limit: PAGE_SIZE })
    files.value = [...files.value, ...res.data]
    total.value = res.total
    page.value = res.page
  } catch {
    error.value = '文件列表加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadMore)

// 图片 → 查看器；其他类型 → blob 下载到本地
const previewVisible = ref(false)
const previewFile = ref<{ url: string; name: string; size: string } | null>(null)

function openPreview(file: { url: string; name: string; size: number }) {
  previewFile.value = {
    url: fileUrlOf(file.url),
    name: file.name,
    size: formatFileSize(file.size),
  }
  previewVisible.value = true
}

function onFileClick(file: MediaFile) {
  if (isImageExt(file.extension)) {
    openPreview(file)
  } else {
    downloadFile(fileUrlOf(file.url), file.name).then((ok) => {
      if (!ok) {
        showToast('下载失败，已在新窗口打开')
      }
    })
  }
}
</script>

<template>
  <section class="file-gallery">
    <header class="file-gallery__header">
      <button type="button" class="file-gallery__back" @click="router.back()">← 返回聊天</button>
      <h1 class="file-gallery__title">文件管理</h1>
      <span class="file-gallery__total">共 {{ total }} 个文件</span>
    </header>

    <!-- 类型分类 Tab -->
    <nav class="file-gallery__tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        class="file-gallery__tab"
        :class="{ 'file-gallery__tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="loading && files.length === 0" class="file-gallery__placeholder">加载中...</p>
    <p v-else-if="error && files.length === 0" class="file-gallery__placeholder file-gallery__error">
      {{ error }}
    </p>
    <p v-else-if="visibleFiles.length === 0" class="file-gallery__placeholder">
      该分类下暂无文件
    </p>

    <ul v-else class="file-gallery__grid">
      <li v-for="file in visibleFiles" :key="file.id" class="file-gallery__card">
        <button
          type="button"
          class="file-gallery__link"
          :title="file.name"
          @click="onFileClick(file)"
        >
          <img
            v-if="isImageExt(file.extension)"
            class="file-gallery__thumb"
            :src="fileUrlOf(file.url)"
            :alt="file.name"
            loading="lazy"
          />
          <span v-else class="file-gallery__icon">{{ fileIconOf(file.extension) }}</span>
          <span class="file-gallery__meta">
            <span class="file-gallery__name">{{ file.name }}</span>
            <span class="file-gallery__size">
              {{ formatFileSize(file.size) }} · {{ formatTime(file.createdAt) }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <!-- 分页加载更多 -->
    <button
      v-if="hasMore"
      type="button"
      class="file-gallery__more"
      :disabled="loading"
      @click="loadMore"
    >
      {{ loading ? '加载中...' : '加载更多' }}
    </button>

    <FilePreview
      :visible="previewVisible"
      :url="previewFile?.url ?? ''"
      :name="previewFile?.name"
      :size="previewFile?.size"
      @close="previewVisible = false"
    />
  </section>
</template>

<style scoped>
.file-gallery {
  min-height: 0;
  padding: 24px 28px;
  display: grid;
  align-content: start;
  gap: 18px;
  overflow-y: auto;
}

.file-gallery__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.file-gallery__back {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-gallery__back:hover {
  background: rgba(0, 240, 255, 0.16);
}

.file-gallery__title {
  font-size: 18px;
  letter-spacing: 0.14em;
}

.file-gallery__total {
  margin-left: auto;
  font-size: 13px;
  color: var(--muted);
}

/* --- 类型分类 Tab --- */
.file-gallery__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-gallery__tab {
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.file-gallery__tab:hover {
  color: var(--text);
  border-color: rgba(255, 228, 92, 0.35);
}

.file-gallery__tab--active {
  color: #02131a;
  font-weight: 700;
  border-color: transparent;
  background: linear-gradient(90deg, var(--yellow), #ffe08a);
}

/* --- 文件卡片网格 --- */
.file-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.file-gallery__card {
  min-width: 0;
}

.file-gallery__link {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.file-gallery__link:hover {
  background: rgba(255, 228, 92, 0.08);
  border-color: rgba(255, 228, 92, 0.35);
  transform: translateY(-2px);
}

.file-gallery__thumb {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  object-fit: cover;
  cursor: zoom-in;
}

.file-gallery__icon {
  height: 120px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 40px;
}

.file-gallery__meta {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.file-gallery__name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-gallery__size {
  font-size: 11px;
  color: var(--muted);
}

.file-gallery__more {
  justify-self: center;
  margin-top: 4px;
  padding: 8px 28px;
  border-radius: 999px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-gallery__more:hover:not(:disabled) {
  background: rgba(0, 240, 255, 0.16);
}

.file-gallery__more:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-gallery__placeholder {
  padding: 40px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.file-gallery__error {
  color: var(--pink);
}
</style>
