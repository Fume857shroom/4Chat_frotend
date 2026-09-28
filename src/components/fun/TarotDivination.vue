<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { drawSpread, getSpreads, type TarotSpreadMeta, type TarotSpreadResult } from '../../api/fun/tarot'
import { errorText } from '../../composables/errorText'
import TarotSpread from './TarotSpread.vue'

// 牌阵占卜：用户自选牌阵（上游是随机分配，那样"关系问题选吉普赛十字、
// 决策问题选四要素"的场景分化就没意义了）。
// isCut 为 true 的 6 个牌阵要先切牌才能抽——上游有这个字段但从未使用。
const spreads = ref<TarotSpreadMeta[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const selectedKey = ref('')
const result = ref<TarotSpreadResult | null>(null)
const drawing = ref(false)
/** AI 综合解读正在逐字到达 */
const streaming = ref('')
/** 切牌阶段：idle 未开始 / cutting 动画中 / done 已切 */
const cutPhase = ref<'idle' | 'cutting' | 'done'>('idle')
let controller: AbortController | null = null
let cutTimer: ReturnType<typeof setTimeout> | null = null

const selected = computed(() => spreads.value.find((s) => s.key === selectedKey.value) ?? null)
const needCut = computed(() => selected.value?.isCut === true)
const canDraw = computed(() => !!selected.value && !drawing.value && (!needCut.value || cutPhase.value === 'done'))
/** 当前该展示的位含义（多套时按后端返回的 setIndex 取） */
const positions = computed(() => {
  const s = selected.value
  if (!s) return []
  return s.representations[result.value?.setIndex ?? 0] ?? s.representations[0] ?? []
})

async function load() {
  loading.value = true
  try {
    const res = await getSpreads()
    spreads.value = res.data.data ?? []
    if (!selectedKey.value && spreads.value[0]) selectedKey.value = spreads.value[0].key
  } catch (e) {
    error.value = errorText(e, '牌阵列表加载失败')
  } finally {
    loading.value = false
  }
}

function pick(key: string) {
  if (drawing.value) return
  selectedKey.value = key
  result.value = null
  streaming.value = ''
  cutPhase.value = 'idle'
  error.value = null
}

function onCut() {
  if (cutPhase.value !== 'idle') return
  cutPhase.value = 'cutting'
  // 纯前端仪式动作，不影响抽牌结果：牌是后端抽的，切牌只是让用户参与进来
  cutTimer = setTimeout(() => {
    cutPhase.value = 'done'
  }, 900)
}

async function onDraw() {
  if (!canDraw.value) return
  drawing.value = true
  streaming.value = ''
  error.value = null
  controller = new AbortController()

  try {
    await drawSpread(selectedKey.value, (evt) => {
      if (evt.type === 'cards') {
        // 牌面先到，立刻开翻；AI 解读的十几秒被翻牌动画盖住
        result.value = evt.spread
      } else if (evt.type === 'delta') {
        streaming.value += evt.text
      } else if (evt.type === 'done') {
        if (evt.spread) result.value = evt.spread
      } else if (evt.type === 'error') {
        error.value = evt.message
      }
    }, controller.signal)
  } catch (e) {
    if (!controller?.signal.aborted) error.value = errorText(e, '抽牌失败，请稍后重试')
  } finally {
    drawing.value = false
    streaming.value = ''
    controller = null
    // 抽完重置切牌，下次抽同一牌阵要重新切
    cutPhase.value = 'idle'
  }
}

function onCancel() {
  controller?.abort()
  drawing.value = false
}

onMounted(load)
onBeforeUnmount(() => {
  controller?.abort()
  if (cutTimer !== null) clearTimeout(cutTimer)
})
</script>

<template>
  <div class="tdiv">
    <p v-if="error" class="tdiv__error">{{ error }}</p>
    <p v-if="loading" class="tdiv__hint">牌阵加载中…</p>

    <div v-else class="tdiv__layout">
      <!-- 牌阵选择 -->
      <aside class="tdiv__picker">
        <h3 class="tdiv__picker-title">选一个牌阵</h3>
        <button
          v-for="s in spreads"
          :key="s.key"
          class="tdiv__pick"
          :class="{ 'is-active': s.key === selectedKey }"
          :disabled="drawing"
          @click="pick(s.key)"
        >
          <span class="tdiv__pick-name">{{ s.name }}</span>
          <span class="tdiv__pick-meta">{{ s.cardsNum }} 张<template v-if="s.isCut"> · 需切牌</template></span>
        </button>
      </aside>

      <!-- 占卜区 -->
      <section class="tdiv__stage">
        <template v-if="selected">
          <div class="tdiv__head">
            <h3 class="tdiv__title">{{ selected.name }}</h3>
            <p class="tdiv__positions">
              <span v-for="(p, i) in positions" :key="i" class="tdiv__pos">{{ i + 1 }}.{{ p }}</span>
            </p>
          </div>

          <!-- 切牌 -->
          <div v-if="needCut && !result" class="tdiv__cut">
            <div class="tdiv__deck" :class="{ 'is-cutting': cutPhase === 'cutting', 'is-done': cutPhase === 'done' }">
              <span class="tdiv__deck-card" />
              <span class="tdiv__deck-card" />
              <span class="tdiv__deck-card" />
            </div>
            <p class="tdiv__cut-text">
              {{ cutPhase === 'done' ? '切牌完成，可以开始占卜' : '心里想着要问的事，点一下切牌' }}
            </p>
            <button v-if="cutPhase === 'idle'" class="tdiv__btn" @click="onCut">切牌</button>
          </div>

          <button class="tdiv__btn tdiv__btn--main" :disabled="!canDraw" @click="onDraw">
            {{ drawing ? '占卜中…' : '开始占卜' }}
          </button>
          <button v-if="drawing" class="tdiv__link" @click="onCancel">停止生成</button>

          <TarotSpread
            v-if="result"
            class="tdiv__spread"
            :spread-key="result.spreadKey"
            :slots="result.slots"
            :pending="drawing"
          />

          <!-- AI 综合解读 -->
          <div v-if="streaming" class="tdiv__reading is-streaming">
            {{ streaming }}<span class="tdiv__caret" />
          </div>
          <div v-else-if="result?.reading" class="tdiv__reading">{{ result.reading }}</div>
          <p v-else-if="result && !drawing" class="tdiv__degraded">
            AI 解读暂时不可用，以上为逐张牌义。
          </p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tdiv {
  min-width: 0;
}

.tdiv__hint {
  color: var(--muted);
  font-size: 13px;
}

.tdiv__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 45, 85, 0.35);
  background: rgba(255, 45, 85, 0.08);
  color: #ff8fa3;
  font-size: 13px;
}

.tdiv__layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.tdiv__picker {
  flex: 0 0 186px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 68vh;
  overflow-y: auto;
}

.tdiv__picker-title {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.tdiv__pick {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  text-align: left;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.tdiv__pick:hover:not(:disabled),
.tdiv__pick.is-active {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.07));
}

.tdiv__pick:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tdiv__pick-name {
  font-size: 13px;
}

.tdiv__pick-meta {
  font-size: 11px;
  opacity: 0.75;
}

.tdiv__stage {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tdiv__title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 17px;
  letter-spacing: 0.06em;
}

.tdiv__positions {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
  color: var(--muted);
}

.tdiv__cut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 18px 0;
}

.tdiv__deck {
  position: relative;
  width: 74px;
  height: 118px;
}

.tdiv__deck-card {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  border: 1px solid var(--line);
  background:
    repeating-linear-gradient(45deg, rgba(255, 228, 92, 0.1) 0 5px, transparent 5px 10px),
    linear-gradient(160deg, #2a2350, #14122b);
  transition: transform 0.85s cubic-bezier(0.4, 0.1, 0.2, 1);
}

.tdiv__deck-card:nth-child(1) {
  transform: translate(0, 0);
}
.tdiv__deck-card:nth-child(2) {
  transform: translate(3px, 3px);
}
.tdiv__deck-card:nth-child(3) {
  transform: translate(6px, 6px);
}

.tdiv__deck.is-cutting .tdiv__deck-card:nth-child(1) {
  transform: translate(-34px, -8px) rotate(-14deg);
}
.tdiv__deck.is-cutting .tdiv__deck-card:nth-child(3) {
  transform: translate(40px, -8px) rotate(14deg);
}
.tdiv__deck.is-done .tdiv__deck-card:nth-child(1) {
  transform: translate(-13px, 0) rotate(-5deg);
}
.tdiv__deck.is-done .tdiv__deck-card:nth-child(3) {
  transform: translate(19px, 0) rotate(5deg);
}

.tdiv__cut-text {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.06em;
}

.tdiv__btn {
  align-self: center;
  padding: 9px 22px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.16), rgba(255, 45, 85, 0.12));
  color: var(--text);
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: filter 0.2s;
}

.tdiv__btn:hover:not(:disabled) {
  filter: brightness(1.2);
}

.tdiv__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tdiv__link {
  align-self: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.tdiv__reading {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  font-size: 14px;
  line-height: 1.95;
  /* 后端要求模型输出纯文本，这里保留换行，绝不用 v-html */
  white-space: pre-wrap;
}

.tdiv__reading.is-streaming {
  border-left: 2px solid var(--cyan, #00f0ff);
  background: rgba(0, 240, 255, 0.05);
}

.tdiv__caret {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--cyan, #00f0ff);
  animation: tdiv-blink 1s steps(2) infinite;
}

@keyframes tdiv-blink {
  50% {
    opacity: 0;
  }
}

.tdiv__degraded {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 720px) {
  .tdiv__layout {
    flex-direction: column;
  }
  .tdiv__picker {
    flex: 0 0 auto;
    flex-direction: row;
    flex-wrap: wrap;
    max-height: none;
    overflow: visible;
  }
  .tdiv__pick {
    flex: 1 1 44%;
  }
}
</style>
