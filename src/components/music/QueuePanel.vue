<script setup lang="ts">
import CoverArt from './CoverArt.vue'
import { usePlayerStore } from '../../stores/music/player'

// 队列抽屉：小播放器展开态与「音乐播放」右栏共用这一份，
// 两边点同一行都是 player.playAt(index)，行为与外观都不会各长一套。
const props = withDefaults(
  defineProps<{
    /** 列表最大高度 px（小播放器里矮一点，右栏宽松一点） */
    maxHeight?: number
  }>(),
  { maxHeight: 220 },
)

const player = usePlayerStore()

function onPick(index: number) {
  void player.playAt(index)
}

/** 行首标号：正在播的那行显示 ❙❙ / ▶，其余显示序号 */
function flagOf(index: number): string {
  if (index !== player.queueIndex || player.offQueue) {
    return String(index + 1)
  }

  return player.isPlaying ? '❙❙' : '▶'
}

// 秒 → m:ss（榜单/队列快照可能没时长，空着就交给媒体元数据）
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return ''
  }
  const mm = Math.floor(seconds / 60)
  const ss = Math.floor(seconds % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}
</script>

<template>
  <section class="queue-panel">
    <header class="queue-panel__head">
      <span class="queue-panel__title">播放队列</span>
      <span class="queue-panel__count">{{ player.queue.length }} 首</span>
      <span v-if="player.queueSourceText" class="queue-panel__source">
        {{ player.queueSourceText }}
      </span>
      <button
        v-if="player.queue.length"
        type="button"
        class="queue-panel__clear"
        title="清空队列"
        @click="player.clearQueue()"
      >
        清空
      </button>
    </header>

    <p v-if="!player.queue.length" class="queue-panel__tip">队列是空的，去列表里点一首或直接起播</p>

    <ul v-else class="queue-panel__list" :style="{ maxHeight: `${maxHeight}px` }">
      <li v-for="(item, index) in player.queue" :key="item.songmid + '-' + index">
        <div
          class="queue-row"
          :class="{
            'queue-row--current': index === player.queueIndex && !player.offQueue,
          }"
        >
          <button
            type="button"
            class="queue-row__main"
            :title="`播放 ${item.title}`"
            @click="onPick(index)"
          >
            <span class="queue-row__flag">{{ flagOf(index) }}</span>
            <CoverArt
              :src="item.coverUrl"
              :seed="item.songmid"
              :text="item.title"
              :size="30"
              :radius="8"
            />
            <span class="queue-row__info">
              <span class="queue-row__name">{{ item.title }}</span>
              <span class="queue-row__artist">{{ item.artist }}</span>
            </span>
            <span class="queue-row__duration">{{ formatDuration(item.duration) }}</span>
          </button>

          <button
            type="button"
            class="queue-row__remove"
            :title="`从队列移出 ${item.title}`"
            @click="player.removeFromQueue(index)"
          >
            ✕
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.queue-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.queue-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.queue-panel__title {
  color: var(--text);
  letter-spacing: 0.06em;
}

.queue-panel__count {
  font-variant-numeric: tabular-nums;
}

.queue-panel__source {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cyan);
}

.queue-panel__clear {
  margin-left: auto;
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.queue-panel__clear:hover {
  color: var(--text);
  border-color: rgba(255, 45, 85, 0.4);
}

.queue-panel__tip {
  padding: 10px 0;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.queue-panel__list {
  margin: 0;
  padding: 0 4px 0 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.queue-panel__list::-webkit-scrollbar {
  width: 6px;
}

.queue-panel__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.queue-panel__list > li {
  margin-bottom: 4px;
}

/* --- 队列行 --- */
.queue-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 12px;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.queue-row:hover {
  background: rgba(0, 240, 255, 0.07);
}

.queue-row--current {
  border-color: rgba(0, 240, 255, 0.35);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.06));
}

.queue-row__main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 6px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.queue-row__flag {
  flex-shrink: 0;
  width: 16px;
  color: var(--cyan);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.queue-row__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.queue-row__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.queue-row__artist {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 11px;
}

.queue-row__duration {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.queue-row__remove {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-right: 4px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.queue-row__remove:hover {
  color: var(--pink);
  background: rgba(255, 45, 85, 0.12);
}
</style>
