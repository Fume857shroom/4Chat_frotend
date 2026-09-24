<script setup lang="ts">
import CoverArt from './CoverArt.vue'
import type { MusicPlaylistItem } from '../../types/music'

// 歌单里的一行曲目：左栏「我的收藏」与右栏歌单明细的行内结构一模一样，
// 只有尾部按钮的语义不同（移出收藏 / ★ 收藏 + 移出歌单），
// 所以尾部留成默认 slot 由父级摆，别在这里堆一串布尔开关。
// 同理整行主按钮的 title 两栏文案不同，也交给父级传进来。
defineProps<{
  item: MusicPlaylistItem
  /** 当前正在播的就是这一首 */
  playing: boolean
  /** 整行主按钮的提示文案 */
  mainTitle: string
}>()

// 点整行 = 从这一首开始把这一列排成队列播，播哪一份由父级定
const emit = defineEmits<{
  play: []
}>()

// 秒 → m:ss
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '--:--'
  }
  const mm = Math.floor(seconds / 60)
  const ss = Math.floor(seconds % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}

// 加入时间：列表里放不下一整串 ISO，取到分钟
function dayLabel(iso: string): string {
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) {
    return ''
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <li class="fav-row" :class="{ 'fav-row--current': playing }">
    <button
      type="button"
      class="fav-row__main"
      :title="mainTitle"
      @click="emit('play')"
    >
      <CoverArt
        :src="item.coverUrl"
        :seed="item.songmid"
        :text="item.title"
        :size="40"
        :radius="10"
      />
      <span class="fav-row__info">
        <span class="fav-row__name">{{ item.title }}</span>
        <span class="fav-row__sub">
          {{ item.artist }} · {{ item.addedName }}加入于 {{ dayLabel(item.addedAt) }}
        </span>
      </span>
      <span v-if="item.hasLocal" class="fav-row__chip">本地</span>
      <span class="fav-row__duration">{{ formatDuration(item.duration) }}</span>
    </button>

    <slot />
  </li>
</template>

<style scoped>
.fav-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  transition:
    background 0.2s,
    border-color 0.2s;
}

.fav-row:hover {
  border-color: rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.07);
}

.fav-row--current {
  border-color: rgba(0, 240, 255, 0.5);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.06));
}

.fav-row__main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.fav-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.fav-row__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.fav-row__sub {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 12px;
}

.fav-row__chip {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid rgba(255, 228, 92, 0.4);
  border-radius: 999px;
  color: var(--yellow);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.fav-row__duration {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
