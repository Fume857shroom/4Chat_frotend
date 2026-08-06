<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InfoPanel from '../InfoPanel.vue'
import FilePreview from './FilePreview.vue'
import { fetchFiles } from '../../api/chat/message'
import type { MediaFile } from '../../api/chat/message'
import { fileUrlOf, formatFileSize, isImageExt, downloadFile } from '../../composables/file'
import { showToast } from '../../composables/toast'

// 面板只展示最近 3 份文件（不分类），完整列表见文件管理页 /chat/files
const RECENT_LIMIT = 3

const router = useRouter()

const files = ref<MediaFile[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 图片查看器状态（与聊天页共用 FilePreview 组件）
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

// 图片 → 查看器；其他类型 → blob 下载到本地
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

// 最近 3 份文件：第一页 limit=3（后端按发送时间倒序）
async function loadRecent() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchFiles({ page: 1, limit: RECENT_LIMIT })
    files.value = res.data
  } catch {
    error.value = '媒体库加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadRecent)
</script>

<template>
  <InfoPanel title="媒体库" accent="#ffe45c" :count="files.length">
    <!-- 标题右侧入口：进入文件管理页（按类型分类展示全部文件） -->
    <template #extra>
      <button
        type="button"
        class="media-library__more"
        title="查看全部文件"
        @click="router.push({ name: 'files' })"
      >
        查看全部 →
      </button>
    </template>

    <p v-if="loading" class="media-library__placeholder">加载中...</p>
    <p v-else-if="error" class="media-library__placeholder media-library__error">{{ error }}</p>
    <ul v-else-if="files.length > 0" class="media-library__list">
      <li v-for="file in files" :key="file.id" class="media-library__item">
        <button
          type="button"
          class="media-library__link"
          :title="file.name"
          @click="onFileClick(file)"
        >
          <span class="media-library__info">
            <span class="media-library__name">{{ file.name }}</span>
            <span class="media-library__meta">
              {{ formatFileSize(file.size) }} · {{ formatTime(file.createdAt) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else class="media-library__placeholder">暂无文件</p>
  </InfoPanel>

  <FilePreview
    :visible="previewVisible"
    :url="previewFile?.url ?? ''"
    :name="previewFile?.name"
    :size="previewFile?.size"
    @close="previewVisible = false"
  />
</template>

<style scoped>
.media-library__more {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 228, 92, 0.35);
  background: rgba(255, 228, 92, 0.08);
  color: var(--yellow);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.media-library__more:hover {
  background: rgba(255, 228, 92, 0.18);
}

.media-library__list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.media-library__item {
  min-width: 0;
}

.media-library__link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.media-library__link:hover {
  background: rgba(255, 228, 92, 0.08);
  border-color: rgba(255, 228, 92, 0.35);
}

.media-library__info {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.media-library__name {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-library__meta {
  font-size: 11px;
  color: var(--muted);
}

.media-library__placeholder {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

.media-library__error {
  color: var(--pink);
}
</style>
