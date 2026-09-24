<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePlaylistStore } from '../../stores/music/playlist'

// 一颗 ★：把这首歌加入 / 移出「我的收藏」。
// 榜单行、动态卡、搜索结果里的整行本身另有动作（试听、看详情），
// 所以这里 pointerdown/click 都要 stopPropagation，点星只当点星。
const props = withDefaults(
  defineProps<{
    songmid: string
    /** 歌名，只用于 title 提示 */
    trackTitle?: string
  }>(),
  { trackTitle: '' },
)

const playlist = usePlaylistStore()

const busy = ref(false)
const isOn = computed(() => playlist.isFavorite(props.songmid))

// 点亮态依赖收藏条目集，而榜单页/动态页原本不会去拉它。
// 不在这里兜底的话，星会一律显示未收藏，点下去还走「新增」分支撞 409。
// store 内有 favLoading/favLoaded 去重，多个星同时挂载只会发一次请求。
onMounted(() => {
  void playlist.fetchFavorites()
})
const label = computed(() => {
  const name = props.trackTitle ? ` ${props.trackTitle}` : ''
  return isOn.value ? `已在我的收藏里，点击移除${name}` : `加入我的收藏${name}`
})

async function onToggle() {
  if (busy.value) {
    return
  }

  busy.value = true

  try {
    await playlist.toggleFavorite(props.songmid)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="fav-star"
    :class="{ 'fav-star--on': isOn, 'fav-star--busy': busy }"
    :title="label"
    :aria-label="label"
    :aria-pressed="isOn"
    :disabled="busy"
    @click.stop="onToggle"
  >
    ★
  </button>
</template>

<style scoped>
.fav-star {
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
  font-size: 16px;
  line-height: 1;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.fav-star:hover:not(:disabled) {
  border-color: rgba(255, 228, 92, 0.35);
  background: rgba(255, 228, 92, 0.08);
  color: var(--yellow);
}

.fav-star--on {
  color: var(--yellow);
}

.fav-star--busy {
  opacity: 0.5;
  cursor: wait;
}
</style>
