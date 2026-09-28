<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TarotSlot } from '../../api/fun/tarot'
import TarotCard from './TarotCard.vue'
import { NARROW_BREAKPOINT, layoutOf } from './tarotLayout'

// 牌阵渲染：宽屏按正宗几何绝对定位，窄屏降级成竖向列表。
// 牌面先到、解读后到，所以这里负责把翻牌做成逐张延迟——
// 那十几秒的 AI 生成时间就藏在翻牌动画里，用户不会盯着空白屏等。
const props = defineProps<{
  spreadKey: string
  slots: TarotSlot[]
  /** 是否正在等 AI 解读（影响提示文案） */
  pending?: boolean
}>()

const layout = computed(() => layoutOf(props.spreadKey, props.slots.length))

/* ---------- 窄屏判定 ---------- */
const narrow = ref(false)
let mq: MediaQueryList | null = null
function onMqChange(e: MediaQueryListEvent) {
  narrow.value = e.matches
}
onMounted(() => {
  mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT}px)`)
  narrow.value = mq.matches
  mq.addEventListener('change', onMqChange)
})
onBeforeUnmount(() => mq?.removeEventListener('change', onMqChange))

/* ---------- 逐张翻牌 ---------- */
const revealed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function stopReveal() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function startReveal() {
  stopReveal()
  revealed.value = 0
  const total = props.slots.length
  if (total === 0) return
  // 每张间隔 380ms，8 张牌阵约 3 秒翻完
  timer = setInterval(() => {
    revealed.value += 1
    if (revealed.value >= total) stopReveal()
  }, 380)
}

watch(() => [props.spreadKey, props.slots.length], startReveal, { immediate: true })
onBeforeUnmount(stopReveal)

/* ---------- 桌面端定位样式 ---------- */
function slotStyle(i: number) {
  const s = layout.value.slots[i]
  if (!s) return undefined
  return {
    left: `${s.x}%`,
    top: `${s.y}%`,
    width: `${layout.value.cardWidth}%`,
    // 牌本身以中心点对齐坐标，旋转（扇形牌阵）绕自身中心
    transform: `translate(-50%, -50%) rotate(${s.rotate}deg)`,
  }
}

// aspect 必须用 CSS 变量传下去：它既要喂 aspect-ratio，又要参与 max-width 的 calc。
// 之前写的是 aspect-ratio + max-height，高度被夹住之后宽高比就破了，
// 而牌宽是按舞台宽度百分比算的，结果牌高超出舞台、上下被裁掉一截。
const stageStyle = computed(() => ({ '--tarot-ar': String(layout.value.aspect) }) as Record<string, string>)
</script>

<template>
  <div class="spread">
    <!-- 宽屏：几何布局 -->
    <div v-if="!narrow" class="spread__stage" :style="stageStyle">
      <div v-for="(slot, i) in slots" :key="slot.index" class="spread__slot" :style="slotStyle(i)">
        <TarotCard
          :pic="slot.pic"
          :name="slot.cardName"
          :reversed="slot.reversed"
          :position-label="slot.positionLabel"
          :slot-name="slot.slotName"
          :face-up="i < revealed"
          size="sm"
        />
      </div>
    </div>

    <!-- 窄屏：竖向列表，牌够大能看清 -->
    <ul v-else class="spread__list">
      <li v-for="(slot, i) in slots" :key="slot.index" class="spread__row">
        <div class="spread__row-card">
          <TarotCard
            :pic="slot.pic"
            :reversed="slot.reversed"
            :face-up="i < revealed"
            size="sm"
          />
        </div>
        <div class="spread__row-text">
          <p class="spread__row-slot">{{ i + 1 }}. {{ slot.slotName }}</p>
          <p class="spread__row-name">{{ slot.cardName }} · {{ slot.positionLabel }}</p>
          <p class="spread__row-meaning">{{ slot.meaning }}</p>
        </div>
      </li>
    </ul>

    <p v-if="pending" class="spread__pending">牌已翻开，解读正在生成…</p>
  </div>
</template>

<style scoped>
.spread {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.spread__stage {
  position: relative;
  width: 100%;
  /* 用宽度上限守住纵向预算，保证 aspect-ratio 恒成立、舞台不会被压扁 */
  max-width: calc(var(--tarot-ar) * 60vh);
  aspect-ratio: var(--tarot-ar);
  margin: 0 auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(ellipse at 50% 40%, rgba(0, 240, 255, 0.07), transparent 65%),
    rgba(255, 255, 255, 0.02);
}

.spread__slot {
  position: absolute;
}

/* --- 窄屏列表 --- */
.spread__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spread__row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}

.spread__row-card {
  flex: 0 0 74px;
}

.spread__row-text {
  min-width: 0;
  flex: 1;
}

.spread__row-slot {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--cyan, #00f0ff);
}

.spread__row-name {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.spread__row-meaning {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
}

.spread__pending {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-align: center;
}
</style>
