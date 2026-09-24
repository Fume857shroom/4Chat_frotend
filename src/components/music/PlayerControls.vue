<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '../../stores/music/player'

// 播放控件：进度 / 走带 / 循环与随机 / 音量。
// 小播放器展开态与「歌 → 音乐播放」右栏共用这一份：两处状态都来自 player store，
// 所以任意一边操作另一边立刻跟着变，也不会出现两套行为不一致的控件。
const player = usePlayerStore()

// 拖动进度条时先跟手显示，松手才提交给 store（避免 timeupdate 把滑块拽回去）
const dragPos = ref<number | null>(null)

const maxTime = computed(() => Math.floor(player.duration) || 0)
const seekValue = computed(() => Math.floor(dragPos.value ?? player.currentTime))

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

function onVolumeInput(e: Event) {
  void player.setVolume(Number((e.target as HTMLInputElement).value))
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
  <div class="player-controls">
    <div class="player-controls__seek">
      <span class="player-controls__time">{{ formatClock(player.currentTime) }}</span>
      <input
        class="player-controls__range"
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
      <span class="player-controls__time">{{ formatClock(player.duration) }}</span>
    </div>

    <div class="player-controls__row">
      <button type="button" class="player-controls__btn" title="上一首" @click="player.prev()">
        ⏮
      </button>
      <button
        type="button"
        class="player-controls__btn player-controls__btn--main"
        :title="player.isPlaying ? '暂停' : '播放'"
        :disabled="player.isLoading"
        @click="player.togglePlayback()"
      >
        {{ player.isPlaying ? '❙❙' : '▶' }}
      </button>
      <button type="button" class="player-controls__btn" title="下一首" @click="player.next()">
        ⏭
      </button>
      <button
        type="button"
        class="player-controls__btn player-controls__btn--wide"
        :class="{ 'player-controls__btn--on': player.repeat !== 'off' }"
        :title="`循环方式：${player.repeatLabel}，点击切换`"
        @click="player.cycleRepeat()"
      >
        {{ player.repeatIcon }} {{ player.repeatLabel }}
      </button>
      <button
        type="button"
        class="player-controls__btn player-controls__btn--wide"
        :class="{ 'player-controls__btn--on': player.shuffle }"
        title="随机播放队列"
        @click="player.toggleShuffle()"
      >
        🔀 随机
      </button>
      <button
        type="button"
        class="player-controls__btn"
        title="停止"
        @click="player.stop()"
      >
        ⏹
      </button>
    </div>

    <div class="player-controls__volume">
      <span class="player-controls__time">音量</span>
      <input
        class="player-controls__range"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="player.volume"
        aria-label="音量"
        @input="onVolumeInput"
      />
    </div>
  </div>
</template>

<style scoped>
.player-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.player-controls__seek,
.player-controls__volume {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-controls__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.player-controls__time {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.player-controls__btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  transition:
    color 0.2s,
    background 0.2s,
    border-color 0.2s;
}

.player-controls__btn:hover:not(:disabled) {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}

.player-controls__btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.player-controls__btn--main {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  color: #081017;
  background: linear-gradient(135deg, var(--cyan), #8dffcf);
  font-size: 13px;
}

.player-controls__btn--main:hover:not(:disabled) {
  color: #081017;
  background: linear-gradient(135deg, var(--cyan), #8dffcf);
}

.player-controls__btn--wide {
  width: auto;
  padding: 0 8px;
  border-color: var(--line);
  background: var(--panel-soft);
  font-size: 11px;
  white-space: nowrap;
}

.player-controls__btn--on {
  border-color: rgba(0, 240, 255, 0.45);
  color: var(--cyan);
}

.player-controls__range {
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

.player-controls__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: var(--cyan);
}

.player-controls__range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: var(--cyan);
}

.player-controls__range:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
