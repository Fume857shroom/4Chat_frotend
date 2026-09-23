<script setup lang="ts">
import { computed, ref } from 'vue'
import CoverArt from './CoverArt.vue'
import { usePlayerStore } from '../../stores/music/player'

// 常驻底栏：曲目与播放状态都在 player store，切子页不丢状态
// （store 里的 <audio> 也是脱离 DOM 的单例，切栏目不会中断播放）
const player = usePlayerStore()

// 拖动进度条时先跟手显示，松手才提交给 store（避免 timeupdate 把滑块拽回去）
const dragPos = ref<number | null>(null)

const maxTime = computed(() => Math.floor(player.duration) || 0)
const seekValue = computed(() => Math.floor(dragPos.value ?? player.currentTime))

const statusText = computed(() => {
  if (player.error) {
    return player.error
  }
  if (player.isLoading) {
    return '取址中...'
  }
  return player.track?.artist || ''
})

function onSeekInput(e: Event) {
  dragPos.value = Number((e.target as HTMLInputElement).value)
}

function onSeekCommit() {
  if (dragPos.value === null) {
    return
  }
  const target = dragPos.value
  dragPos.value = null
  void player.seek(target)
}

// 秒 → m:ss
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0))
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}
</script>

<template>
  <div v-if="player.hasTrack" class="now-playing">
    <CoverArt
      :src="player.track?.coverUrl ?? ''"
      :seed="player.track?.songmid ?? ''"
      :text="player.track?.title ?? ''"
      :size="44"
      :radius="12"
    />

    <div class="now-playing__meta">
      <p class="now-playing__title" :title="player.track?.title">
        {{ player.track?.title }}
      </p>
      <p
        class="now-playing__sub"
        :class="{ 'now-playing__sub--error': !!player.error }"
        :title="statusText"
      >
        {{ statusText }}
      </p>
    </div>

    <div class="now-playing__controls">
      <button
        type="button"
        class="now-playing__btn"
        :title="player.isPlaying ? '暂停' : '播放'"
        :disabled="player.isLoading"
        @click="player.toggle()"
      >
        {{ player.isPlaying ? '❙❙' : '▶' }}
      </button>
      <button
        type="button"
        class="now-playing__btn now-playing__btn--ghost"
        title="停止"
        @click="player.stop()"
      >
        ⏹
      </button>
    </div>

    <div class="now-playing__seek">
      <span class="now-playing__time">{{ formatClock(player.currentTime) }}</span>
      <input
        class="now-playing__bar"
        type="range"
        min="0"
        :max="maxTime"
        step="1"
        :value="seekValue"
        :disabled="!maxTime"
        aria-label="播放进度"
        @input="onSeekInput"
        @change="onSeekCommit"
      />
      <span class="now-playing__time">{{ formatClock(player.duration) }}</span>
    </div>
  </div>
</template>

<style scoped>
.now-playing {
  position: fixed;
  left: var(--sidebar-width);
  right: 0;
  bottom: 0;
  z-index: 900;
  display: grid;
  grid-template-columns: auto minmax(0, 1.4fr) auto minmax(0, 2fr);
  align-items: center;
  gap: 14px;
  padding: 10px 24px;
  /* iOS 刘海屏底部安全区（不支持 env() 时上面一行兜底） */
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(20, 20, 30, 0.94), rgba(10, 10, 15, 0.98)),
    var(--panel-strong);
  backdrop-filter: blur(14px);
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.4);
}

.now-playing__meta {
  min-width: 0;
}

.now-playing__title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.now-playing__sub {
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.now-playing__sub--error {
  color: var(--pink);
}

.now-playing__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.now-playing__btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #081017;
  background: linear-gradient(135deg, var(--cyan), #8dffcf);
  font-size: 14px;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.now-playing__btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.now-playing__btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.now-playing__btn--ghost {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  background: var(--panel-soft);
  color: var(--muted);
  font-size: 12px;
}

.now-playing__btn--ghost:hover {
  color: var(--text);
  border-color: rgba(255, 45, 85, 0.4);
}

.now-playing__seek {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.now-playing__time {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.now-playing__bar {
  flex: 1;
  min-width: 0;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}

.now-playing__bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: var(--cyan);
}

.now-playing__bar::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: var(--cyan);
}

.now-playing__bar:disabled {
  cursor: default;
  opacity: 0.5;
}

@media (max-width: 900px) {
  .now-playing {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .now-playing__seek {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .now-playing {
    left: 0;
  }
}
</style>
