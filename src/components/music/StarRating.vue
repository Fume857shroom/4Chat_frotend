<script setup lang="ts">
import { computed } from 'vue'

/**
 * 只读星级。评分现在是 0.5 一档（0 = 不评分），均值更是小数，
 * 所以不做 Math.round —— 直接按比例裁亮度和，3.5 就是 70% 宽。
 * 两层用同一个 ★ 字形（底层压暗），避免 ★/☆ 字宽不同导致裁剪错位。
 */
const props = defineProps<{
  score: number
  size?: number
}>()

const percent = computed(() => {
  const value = Number.isFinite(props.score) ? props.score : 0
  return `${Math.min(100, Math.max(0, (value / 5) * 100))}%`
})

const fontSize = computed(() => `${props.size ?? 14}px`)
</script>

<template>
  <!-- 两层字形对读屏软件是噪音，藏起来；分值要念出来由调用方用 aria-label 传 -->
  <span class="star-rating" role="img" :style="{ fontSize }">
    <span class="star-rating__base" aria-hidden="true">★★★★★</span>
    <span class="star-rating__fill" aria-hidden="true" :style="{ width: percent }">★★★★★</span>
  </span>
</template>

<style scoped>
.star-rating {
  position: relative;
  display: inline-block;
  line-height: 1;
  letter-spacing: 1px;
  white-space: nowrap;
}

.star-rating__base {
  color: rgba(255, 255, 255, 0.18);
}

.star-rating__fill {
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  color: var(--yellow);
}
</style>
