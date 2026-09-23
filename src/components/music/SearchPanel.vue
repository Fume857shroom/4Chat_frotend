<script setup lang="ts">
import { ref } from 'vue'
import CoverArt from './CoverArt.vue'
import { searchMusic } from '../../api/music'
import type { MusicSearchItem } from '../../types/music'
import { usePlayerStore } from '../../stores/music/player'

// 搜索结果只在「音乐播放」页内使用 → 页面局部状态，不进 store
const player = usePlayerStore()

const keyword = ref('')
const results = ref<MusicSearchItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
// 区分「还没搜过」与「搜了没有结果」
const searched = ref(false)
const searchedKeyword = ref('')

async function onSearch() {
  const kw = keyword.value.trim()

  if (!kw || loading.value) {
    return
  }

  loading.value = true
  error.value = null

  try {
    results.value = await searchMusic(kw)
    searchedKeyword.value = kw
    searched.value = true
  } catch (e: unknown) {
    results.value = []
    // 后端中文提示原样透出（http 拦截器已把 message 挂在 error.message 上）
    error.value = e instanceof Error ? e.message : '搜索失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function onPick(item: MusicSearchItem) {
  void player.playTrack(item)
}

// 秒 → m:ss
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '--:--'
  }
  const mm = Math.floor(seconds / 60)
  const ss = Math.floor(seconds % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}
</script>

<template>
  <section class="search-panel">
    <header class="search-panel__header">
      <h3 class="search-panel__title">音乐播放</h3>
      <p class="search-panel__subtitle">输入歌名（可带上歌手），Enter 搜索 QQ 音乐</p>
    </header>

    <form class="search-panel__form" @submit.prevent="onSearch">
      <label class="search-panel__field">
        <span class="sr-only">搜索歌曲</span>
        <input
          v-model="keyword"
          type="search"
          maxlength="60"
          placeholder="歌名 / 歌手，如：晴天 周杰伦"
          :disabled="loading"
        />
      </label>
      <button type="submit" class="search-panel__submit" :disabled="loading || !keyword.trim()">
        {{ loading ? '搜索中...' : '搜索' }}
      </button>
    </form>

    <p v-if="loading" class="search-panel__tip">搜索中...</p>
    <p v-else-if="error" class="search-panel__tip search-panel__tip--error">{{ error }}</p>
    <p v-else-if="!searched" class="search-panel__tip">还没搜索，输入歌名按 Enter 开始</p>
    <p v-else-if="results.length === 0" class="search-panel__tip">
      没有找到「{{ searchedKeyword }}」相关歌曲
    </p>

    <ul v-else class="search-panel__list">
      <li v-for="item in results" :key="item.songmid">
        <button
          type="button"
          class="track-row"
          :class="{ 'track-row--current': player.track?.songmid === item.songmid }"
          :title="`播放 ${item.title}`"
          @click="onPick(item)"
        >
          <CoverArt :src="item.coverUrl" :seed="item.songmid" :text="item.title" :size="46" />

          <span class="track-row__info">
            <span class="track-row__title">
              <span class="track-row__name">{{ item.title }}</span>
              <span v-if="item.needsLogin" class="track-row__flag">需登录</span>
            </span>
            <span class="track-row__sub">{{ item.artist }}<template v-if="item.album"> · {{ item.album }}</template></span>
          </span>

          <span class="track-row__duration">{{ formatDuration(item.duration) }}</span>
          <span class="track-row__play">{{
            player.track?.songmid === item.songmid && player.isPlaying ? '❙❙' : '▶'
          }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.05), transparent 30%),
    var(--panel);
  box-shadow: var(--shadow);
}

.search-panel__title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--cyan), var(--pink));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.search-panel__subtitle {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

/* --- 搜索框 --- */
.search-panel__form {
  display: flex;
  gap: 10px;
}

.search-panel__field {
  flex: 1;
  min-width: 0;
}

.search-panel__field input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.search-panel__field input:focus {
  border-color: rgba(0, 240, 255, 0.7);
  box-shadow: 0 0 0 4px rgba(0, 240, 255, 0.12);
}

.search-panel__field input::placeholder {
  color: var(--muted);
}

.search-panel__submit {
  min-width: 88px;
  padding: 10px 18px;
  border: 0;
  border-radius: 14px;
  color: #081017;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
  font-weight: 700;
  letter-spacing: 0.06em;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.search-panel__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.search-panel__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- 状态提示 --- */
.search-panel__tip {
  padding: 18px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.search-panel__tip--error {
  color: var(--pink);
}

/* --- 结果列表 --- */
.search-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.search-panel__list::-webkit-scrollbar {
  width: 6px;
}

.search-panel__list::-webkit-scrollbar-track {
  background: transparent;
}

.search-panel__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.search-panel__list > li {
  flex: 0 0 auto;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.track-row:hover {
  border-color: rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.08);
}

.track-row--current {
  border-color: rgba(0, 240, 255, 0.5);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.08));
}

.track-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.track-row__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
}

.track-row__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-row__flag {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid rgba(255, 228, 92, 0.4);
  border-radius: 999px;
  color: var(--yellow);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.track-row__sub {
  color: var(--muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-row__duration {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.track-row__play {
  flex-shrink: 0;
  width: 26px;
  text-align: center;
  color: var(--cyan);
  font-size: 13px;
}
</style>
