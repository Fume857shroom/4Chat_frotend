<script setup lang="ts">
import { onMounted } from 'vue'
import CoverArt from './CoverArt.vue'
import type { MusicShareItem } from '../../types/music'
import { usePlayerStore } from '../../stores/music/player'
import { useShareStore } from '../../stores/music/share'

// 分享动态不带封面字段 → 一律走 songmid 哈希占位图（见 CoverArt）
const player = usePlayerStore()
const shareStore = useShareStore()

onMounted(() => {
  void shareStore.fetchFeed(1)
})

function onPlay(share: MusicShareItem) {
  void player.playTrack({
    songmid: share.songmid,
    title: share.title,
    artist: share.artist,
    duration: share.duration,
    coverUrl: share.coverUrl,
  })
}

function starsOf(score: number): string {
  const value = Math.min(5, Math.max(0, Math.round(score)))
  return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`
}

// 可读日期 + 时间：今天 / 昨天 带 HH:mm，更早的补月份、跨年补年份
function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const diff = Math.round((today - day) / 86400000)

    if (diff === 0) {
      return `今天 ${time}`
    }
    if (diff === 1) {
      return `昨天 ${time}`
    }

    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const stamp = `${mm}-${dd} ${time}`

    return d.getFullYear() === now.getFullYear() ? stamp : `${d.getFullYear()}-${stamp}`
  } catch {
    return ''
  }
}
</script>

<template>
  <section class="share-feed">
    <header class="share-feed__header">
      <h3 class="share-feed__title">分享动态</h3>
      <span class="share-feed__total">共 {{ shareStore.total }} 条</span>
      <button
        type="button"
        class="share-feed__refresh"
        :disabled="shareStore.loading"
        @click="shareStore.fetchFeed(1)"
      >
        刷新
      </button>
    </header>

    <p v-if="shareStore.loading && shareStore.list.length === 0" class="share-feed__tip">加载中...</p>
    <p v-else-if="shareStore.error && shareStore.list.length === 0" class="share-feed__tip share-feed__tip--error">
      {{ shareStore.error }}
    </p>
    <p v-else-if="shareStore.list.length === 0" class="share-feed__tip">
      还没有人分享歌曲，去「音乐播放」抢首发
    </p>

    <ul v-else class="share-feed__list">
      <li v-for="share in shareStore.list" :key="share.id" class="share-feed__item">
        <button
          type="button"
          class="share-card"
          :class="{ 'share-card--current': player.track?.songmid === share.songmid }"
          :title="`试听 ${share.title}`"
          @click="onPlay(share)"
        >
          <CoverArt :seed="share.songmid" :text="share.title" :size="48" :radius="14" />

          <span class="share-card__body">
            <span class="share-card__head">
              <strong class="share-card__who">{{ share.sharedName }}</strong>
              <span class="share-card__act">分享了</span>
              <time class="share-card__when">{{ formatWhen(share.createdAt) }}</time>
            </span>

            <span class="share-card__song">
              <span class="share-card__name">{{ share.title }}</span>
              <span class="share-card__artist">- {{ share.artist }}</span>
            </span>

            <span class="share-card__stars" :aria-label="`${share.score} 分`">
              {{ starsOf(share.score) }}
            </span>

            <span v-if="share.note" class="share-card__note">{{ share.note }}</span>

            <span class="share-card__hint">▶ 点击试听</span>
          </span>
        </button>
      </li>
    </ul>

    <button
      v-if="shareStore.hasMore"
      type="button"
      class="share-feed__more"
      :disabled="shareStore.loadingMore"
      @click="shareStore.loadMore()"
    >
      {{ shareStore.loadingMore ? '加载中...' : '加载更多' }}
    </button>
  </section>
</template>

<style scoped>
.share-feed {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 45, 85, 0.05), transparent 30%),
    var(--panel);
  box-shadow: var(--shadow);
}

.share-feed__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.share-feed__title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--pink), var(--yellow));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.share-feed__total {
  margin-left: auto;
  color: var(--muted);
  font-size: 12px;
}

.share-feed__refresh {
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel-soft);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.share-feed__refresh:hover:not(:disabled) {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.4);
}

.share-feed__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-feed__tip {
  padding: 26px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.share-feed__tip--error {
  color: var(--pink);
}

.share-feed__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0 4px 0 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.share-feed__list::-webkit-scrollbar {
  width: 6px;
}

.share-feed__list::-webkit-scrollbar-track {
  background: transparent;
}

.share-feed__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.share-feed__list > li {
  flex: 0 0 auto;
}

/* --- 动态卡片 --- */
.share-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px;
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

.share-card:hover {
  border-color: rgba(255, 45, 85, 0.35);
  background: rgba(255, 45, 85, 0.06);
}

.share-card--current {
  border-color: rgba(0, 240, 255, 0.5);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.1), rgba(255, 45, 85, 0.06));
}

.share-card__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.share-card__head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.share-card__who {
  color: var(--cyan);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 45%;
}

.share-card__act {
  color: var(--muted);
}

.share-card__when {
  margin-left: auto;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.share-card__song {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.share-card__name {
  font-size: 14px;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-card__artist {
  color: var(--muted);
  font-size: 12px;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-card__stars {
  color: var(--yellow);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.share-card__note {
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.share-card__hint {
  color: rgba(0, 240, 255, 0.7);
  font-size: 11px;
  letter-spacing: 0.06em;
}

.share-feed__more {
  align-self: center;
  padding: 8px 28px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.share-feed__more:hover:not(:disabled) {
  background: rgba(0, 240, 255, 0.16);
}

.share-feed__more:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
