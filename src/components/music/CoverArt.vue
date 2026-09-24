<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { avatarHue } from '../../composables/avatar'

// 封面：QQ 音乐 CDN 的地址样式不作保证（可能 404 / 可能为空），
// 因此一律带确定性占位图 —— 复用 composables/avatar 的按种子哈希取色，
// 同一首歌（songmid 相同）在任何列表里颜色恒定。
const props = withDefaults(
  defineProps<{
    src?: string
    /** 占位图取色种子，固定传 songmid */
    seed: string
    /** 占位图文字，一般传歌名首字 */
    text?: string
    /** 边长 px（各调用方自己定尺寸） */
    size?: number
    radius?: number
  }>(),
  {
    src: '',
    text: '',
    size: 44,
    radius: 12,
  },
)

const broken = ref(false)

// 换封面（切歌）后重新给一次加载机会
watch(
  () => props.src,
  () => {
    broken.value = false
  },
)

const imageUrl = computed(() => (props.src && !broken.value ? props.src : ''))
const hue = computed(() => avatarHue(props.seed))

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${props.radius}px`,
  background: `linear-gradient(135deg, hsl(${hue.value} 55% 42%), hsl(${(hue.value + 40) % 360} 60% 30%))`,
}))

// 占位字随尺寸缩放（列表 40px / 正在播放 160px 共用一套）
const fallbackStyle = computed(() => ({
  fontSize: `${Math.max(12, Math.round(props.size * 0.34))}px`,
}))
</script>

<template>
  <span class="cover-art" :style="boxStyle">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="text"
      loading="lazy"
      @error="broken = true"
    />
    <span v-else class="cover-art__fallback" :style="fallbackStyle">{{
      text ? text.charAt(0) : '♪'
    }}</span>
  </span>
</template>

<style scoped>
.cover-art {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.cover-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-art__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 600;
}
</style>
