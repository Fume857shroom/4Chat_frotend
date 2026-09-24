<script setup lang="ts">
import { computed } from 'vue'
import type { PlayableTrack } from '../../types/music'
import { usePlayerStore } from '../../stores/music/player'
import { showToast } from '../../composables/toast'

// 一颗 ＋：把这首歌加进当前播放队列（不动收藏）。
// 与 FavoriteButton 一样放在行按钮外面，pointer 事件要 stopPropagation，
// 否则点 ＋ 会连带触发整行的「试听 / 看详情」。
const props = defineProps<{
  track: PlayableTrack
}>()

const player = usePlayerStore()

const index = computed(() => player.queueIndexOf(props.track.songmid))
const isOn = computed(() => index.value >= 0)
const label = computed(() => {
  const name = props.track.title ? ` ${props.track.title}` : ''
  return isOn.value
    ? `已在播放列表第 ${index.value + 1} 首，点击移除${name}`
    : `加入播放列表${name}`
})

function onToggle() {
  const result = player.toggleInQueue(props.track)
  showToast(result === 'added' ? '已加入播放列表' : '已从播放列表移除')
}
</script>

<template>
  <button
    type="button"
    class="fav-queue"
    :class="{ 'fav-queue--on': isOn }"
    :title="label"
    :aria-label="label"
    :aria-pressed="isOn"
    @click.stop="onToggle"
  >
    {{ isOn ? '✓' : '＋' }}
  </button>
</template>

<style scoped>
.fav-queue {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.22);
  font-size: 15px;
  line-height: 1;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.fav-queue:hover {
  border-color: rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
}

.fav-queue--on {
  color: var(--cyan);
}
</style>
