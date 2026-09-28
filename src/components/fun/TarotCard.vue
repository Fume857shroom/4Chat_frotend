<script setup lang="ts">
import { computed } from 'vue'

// 单张塔罗牌：支持背面朝上 → 翻面，逆位靠 CSS 旋转 180°，
// 不在服务端转图（省掉上游那套 PIL 图像处理）
const props = withDefaults(
  defineProps<{
    /** 牌面图路径，形如 /tarot/13.webp */
    pic: string
    name?: string
    reversed?: boolean
    /** false = 背面朝上 */
    faceUp?: boolean
    /** 位置含义，如「过去」；不传则不显示 */
    slotName?: string
    positionLabel?: string
    /** 尺寸档位：牌阵里用小牌，单张展示用大牌 */
    size?: 'sm' | 'md' | 'lg'
    selectable?: boolean
  }>(),
  { name: '', reversed: false, faceUp: true, slotName: '', positionLabel: '', size: 'md', selectable: false },
)

defineEmits<{ click: [] }>()

const rootClass = computed(() => [
  'tcard',
  `tcard--${props.size}`,
  { 'is-flipped': props.faceUp, 'is-selectable': props.selectable },
])

// 逆位旋转作用在图片上而不是整张牌，这样牌名与位含义仍然是正的
const faceStyle = computed(() => (props.reversed ? { transform: 'rotate(180deg)' } : undefined))
</script>

<template>
  <div :class="rootClass" @click="$emit('click')">
    <div class="tcard__inner">
      <!-- 背面：纯 CSS 绘制，不额外要一张图 -->
      <div class="tcard__back" aria-hidden="true">
        <span class="tcard__back-mark">✦</span>
      </div>

      <div class="tcard__face">
        <img v-if="pic" class="tcard__img" :src="pic" :alt="name || '塔罗牌'" :style="faceStyle" loading="lazy" />
        <div v-else class="tcard__missing">无牌面</div>
        <span v-if="reversed" class="tcard__tag">逆位</span>
      </div>
    </div>

    <p v-if="slotName" class="tcard__slot">{{ slotName }}</p>
    <p v-if="name" class="tcard__name">{{ name }}<template v-if="positionLabel"> · {{ positionLabel }}</template></p>
  </div>
</template>

<style scoped>
.tcard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tcard.is-selectable {
  cursor: pointer;
}

.tcard__inner {
  position: relative;
  width: 100%;
  aspect-ratio: 461 / 817; /* 上游原图比例，锁死避免翻面时跳动 */
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.1, 0.2, 1);
}

.tcard.is-flipped .tcard__inner {
  transform: rotateY(180deg);
}

.tcard__back,
.tcard__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.tcard__back {
  display: grid;
  place-items: center;
  background:
    repeating-linear-gradient(45deg, rgba(255, 228, 92, 0.09) 0 6px, transparent 6px 12px),
    linear-gradient(160deg, #2a2350, #14122b 60%, #1d1838);
}

.tcard__back-mark {
  font-size: 22px;
  color: rgba(255, 228, 92, 0.55);
}

.tcard__face {
  transform: rotateY(180deg);
  background: #0e0d1a;
}

.tcard__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tcard__missing {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 11px;
}

.tcard__tag {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #1a1730;
  background: var(--yellow, #ffe45c);
}

.tcard__slot {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--cyan, #00f0ff);
  text-align: center;
}

.tcard__name {
  margin: 0;
  font-size: 12px;
  color: var(--text);
  text-align: center;
  overflow-wrap: anywhere;
}

/* 尺寸档位：宽度由父容器决定，这里只控字号与圆角 */
.tcard--sm .tcard__name {
  font-size: 10px;
}
.tcard--sm .tcard__slot {
  font-size: 10px;
}
.tcard--lg .tcard__name {
  font-size: 14px;
}
.tcard--lg .tcard__slot {
  font-size: 13px;
}
.tcard--lg .tcard__back-mark {
  font-size: 40px;
}
</style>
