<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref } from 'vue'
import { askDaily, drawDaily, getDaily, type TarotAsk, type TarotDaily as Daily } from '../../api/fun/tarot'
import { errorText } from '../../composables/errorText'
import { showToast } from '../../composables/toast'
import TarotCard from './TarotCard.vue'

const QUESTION_MAX = 200

const daily = ref<Daily | null>(null)
const loading = ref(true)
const drawing = ref(false)
const error = ref<string | null>(null)

const question = ref('')
const asking = ref(false)
/** AI 正在逐字吐出的这一段，完成后才并入 asks */
const streaming = ref('')
/** 安全短路返回的转介话术，与正常解读分开渲染 */
const blockedAnswer = ref('')
let controller: AbortController | null = null

const askLeft = computed(() => {
  if (!daily.value) return 0
  return Math.max(daily.value.askLimit - daily.value.askUsed, 0)
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await getDaily()
    daily.value = res.data.data ?? null
  } catch (e) {
    error.value = errorText(e, '读取今日牌失败')
  } finally {
    loading.value = false
  }
}

async function onDraw() {
  drawing.value = true
  error.value = null
  try {
    const res = await drawDaily()
    daily.value = res.data.data ?? null
  } catch (e) {
    error.value = errorText(e, '抽牌失败，请重试')
  } finally {
    drawing.value = false
  }
}

async function onAsk() {
  const q = question.value.trim()
  if (!q || asking.value) return

  asking.value = true
  streaming.value = ''
  blockedAnswer.value = ''
  error.value = null
  controller = new AbortController()

  try {
    await askDaily(q, (evt) => {
      if (evt.type === 'delta') {
        streaming.value += evt.text
      } else if (evt.type === 'done') {
        if (evt.blocked) {
          // 危机转介：不入历史、不消耗额度，直接展示
          blockedAnswer.value = evt.answer ?? ''
        } else if (evt.ask && daily.value) {
          daily.value.asks = [...daily.value.asks, evt.ask]
          daily.value.askUsed = evt.askUsed ?? daily.value.askUsed
        }
        question.value = ''
      } else if (evt.type === 'error') {
        error.value = evt.message
      }
    }, controller.signal)
  } catch (e) {
    // 用户主动取消不算错误
    if (!controller?.signal.aborted) {
      error.value = errorText(e, 'AI 解读失败，请稍后重试')
    }
  } finally {
    asking.value = false
    streaming.value = ''
    controller = null
  }
}

function onCancel() {
  controller?.abort()
  asking.value = false
}

function copyAnswer(a: TarotAsk) {
  navigator.clipboard?.writeText(a.answer).then(
    () => showToast('已复制解读'),
    () => showToast('复制失败'),
  )
}

// 面板包在 KeepAlive 里：首次挂载 onMounted 与 onActivated 都会触发，
// 用 loaded 挡掉重复请求；之后每次切回本标签都重读一次，
// 这样跨过零点再进来能拿到新一天的牌，而不是一直显示昨天的
let loaded = false

onMounted(async () => {
  await load()
  loaded = true
})

onActivated(() => {
  if (loaded) load()
})

onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div class="tdaily">
    <p v-if="loading" class="tdaily__hint">读取中…</p>
    <p v-else-if="error" class="tdaily__error">{{ error }}</p>

    <!-- 今天还没抽 -->
    <div v-if="!loading && !daily" class="tdaily__empty">
      <TarotCard pic="" :face-up="false" size="lg" />
      <p class="tdaily__empty-text">今天还没有抽牌</p>
      <button class="tdaily__btn" :disabled="drawing" @click="onDraw">
        {{ drawing ? '抽牌中…' : '抽一张今日牌' }}
      </button>
    </div>

    <template v-else-if="daily">
      <div class="tdaily__main">
        <div class="tdaily__card">
          <TarotCard
            :pic="daily.card.pic"
            :name="daily.card.cardName"
            :reversed="daily.card.reversed"
            :position-label="daily.card.positionLabel"
            size="lg"
          />
          <p class="tdaily__date">{{ daily.drawDate }}</p>
        </div>

        <div class="tdaily__body">
          <h3 class="tdaily__title">{{ daily.card.cardName }} · {{ daily.card.positionLabel }}</h3>
          <p class="tdaily__meaning">{{ daily.card.meaning }}</p>
          <p class="tdaily__reading">{{ daily.reading }}</p>

          <!-- 提问区 -->
          <div class="tdaily__ask">
            <p class="tdaily__quota">
              今日还可提问 <strong>{{ askLeft }}</strong> / {{ daily.askLimit }} 次
            </p>
            <div class="tdaily__ask-row">
              <textarea
                v-model="question"
                class="tdaily__input"
                :maxlength="QUESTION_MAX"
                :disabled="asking || askLeft === 0"
                rows="2"
                placeholder="想就这张牌问点什么？（可留空，上面的牌面解读已经够用）"
              />
              <button
                class="tdaily__btn"
                :disabled="asking || askLeft === 0 || !question.trim()"
                @click="onAsk"
              >
                {{ asking ? '解读中…' : '问一次' }}
              </button>
            </div>
            <p class="tdaily__count">{{ question.trim().length }}/{{ QUESTION_MAX }}</p>
            <button v-if="asking" class="tdaily__link" @click="onCancel">停止生成</button>
          </div>

          <!-- 流式中的解读 -->
          <p v-if="streaming" class="tdaily__stream">{{ streaming }}<span class="tdaily__caret" /></p>

          <!-- 危机转介 -->
          <div v-if="blockedAnswer" class="tdaily__crisis">{{ blockedAnswer }}</div>

          <!-- 已完成的问答 -->
          <div v-if="daily.asks.length" class="tdaily__asks">
            <div v-for="a in daily.asks" :key="a.id" class="tdaily__qa">
              <p class="tdaily__q">问：{{ a.question }}</p>
              <p class="tdaily__a">{{ a.answer }}</p>
              <button class="tdaily__link" @click="copyAnswer(a)">复制</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tdaily {
  min-width: 0;
}

.tdaily__hint,
.tdaily__empty-text {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.tdaily__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 45, 85, 0.35);
  background: rgba(255, 45, 85, 0.08);
  color: #ff8fa3;
  font-size: 13px;
}

.tdaily__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 0;
}

.tdaily__empty > :first-child {
  width: 150px;
}

.tdaily__main {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.tdaily__card {
  flex: 0 0 168px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tdaily__date {
  margin: 0;
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.tdaily__body {
  flex: 1;
  min-width: 0;
}

.tdaily__title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.06em;
}

.tdaily__meaning {
  margin: 0 0 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--cyan, #00f0ff);
}

.tdaily__reading {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text);
  /* AI 与内置库都按纯文本返回，这里保留换行即可，绝不用 v-html */
  white-space: pre-wrap;
}

.tdaily__ask {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}

.tdaily__quota {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--muted);
}

.tdaily__quota strong {
  color: var(--yellow, #ffe45c);
  font-size: 14px;
}

.tdaily__ask-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.tdaily__input {
  flex: 1;
  min-width: 0;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  resize: vertical;
}

.tdaily__input:focus {
  outline: none;
  border-color: rgba(0, 240, 255, 0.45);
}

.tdaily__count {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--muted);
  text-align: right;
}

.tdaily__btn {
  flex-shrink: 0;
  padding: 9px 18px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.16), rgba(255, 45, 85, 0.12));
  color: var(--text);
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: filter 0.2s;
}

.tdaily__btn:hover:not(:disabled) {
  filter: brightness(1.2);
}

.tdaily__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tdaily__link {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.tdaily__stream {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-left: 2px solid var(--cyan, #00f0ff);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background: rgba(0, 240, 255, 0.05);
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.tdaily__caret {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--cyan, #00f0ff);
  animation: tdaily-blink 1s steps(2) infinite;
}

@keyframes tdaily-blink {
  50% {
    opacity: 0;
  }
}

.tdaily__crisis {
  margin: 14px 0 0;
  padding: 14px;
  border: 1px solid rgba(255, 228, 92, 0.4);
  border-radius: var(--radius-md);
  background: rgba(255, 228, 92, 0.08);
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.tdaily__asks {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tdaily__qa {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}

.tdaily__q {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--cyan, #00f0ff);
}

.tdaily__a {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--text);
  white-space: pre-wrap;
}

@media (max-width: 720px) {
  .tdaily__main {
    flex-direction: column;
    align-items: center;
  }
  .tdaily__card {
    flex: 0 0 auto;
    width: 150px;
  }
}
</style>
