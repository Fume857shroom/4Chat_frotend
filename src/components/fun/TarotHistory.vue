<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getHistory, type TarotDaily, type TarotSpreadResult } from '../../api/fun/tarot'
import { errorText } from '../../composables/errorText'

// 历史记录：每日一抽与牌阵两条流，游标分页（cursor = 上一页最后一条的 id）
const type = ref<'daily' | 'spread'>('daily')
const items = ref<(TarotDaily | TarotSpreadResult)[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const nextCursor = ref<number | null>(null)
const hasMore = ref(false)

/** 后端返回的是联合类型，用 spreadKey 字段区分牌阵记录 */
function isSpread(x: TarotDaily | TarotSpreadResult): x is TarotSpreadResult {
  return 'spreadKey' in x
}

async function load(reset: boolean) {
  loading.value = true
  if (reset) {
    items.value = []
    nextCursor.value = null
    hasMore.value = false
  }
  try {
    const res = await getHistory(type.value, nextCursor.value ?? undefined)
    const body = res.data as { data?: (TarotDaily | TarotSpreadResult)[]; nextCursor?: number | null; hasMore?: boolean }
    const list = body.data ?? []
    items.value = reset ? list : [...items.value, ...list]
    nextCursor.value = body.nextCursor ?? null
    hasMore.value = body.hasMore === true
  } catch (e) {
    error.value = errorText(e, '历史记录加载失败')
  } finally {
    loading.value = false
  }
}

function switchType(t: 'daily' | 'spread') {
  if (t === type.value || loading.value) return
  type.value = t
}

watch(type, () => load(true))
onMounted(() => load(true))

function dateLabel(iso: string): string {
  return iso.slice(0, 10)
}
</script>

<template>
  <div class="thist">
    <div class="thist__tabs">
      <button :class="{ 'is-active': type === 'daily' }" @click="switchType('daily')">每日一抽</button>
      <button :class="{ 'is-active': type === 'spread' }" @click="switchType('spread')">牌阵</button>
    </div>

    <p v-if="error" class="thist__error">{{ error }}</p>
    <p v-if="loading && items.length === 0" class="thist__hint">加载中…</p>
    <p v-else-if="items.length === 0" class="thist__hint">还没有记录</p>

    <!-- 每日一抽历史 -->
    <ul v-if="type === 'daily'" class="thist__list">
      <li v-for="(d, i) in items" :key="i" class="thist__item">
        <img v-if="!isSpread(d) && d.card.pic" class="thist__thumb" :src="d.card.pic" :alt="d.card.cardName" loading="lazy" />
        <div v-if="!isSpread(d)" class="thist__body">
          <p class="thist__top">
            <strong>{{ d.drawDate }}</strong>
            <span>{{ d.card.cardName }} · {{ d.card.positionLabel }}</span>
            <span class="thist__muted">提问 {{ d.askUsed }}/{{ d.askLimit }}</span>
          </p>
          <p class="thist__text">{{ d.reading }}</p>
        </div>
      </li>
    </ul>

    <!-- 牌阵历史 -->
    <ul v-else class="thist__list">
      <li v-for="(s, i) in items" :key="i" class="thist__item">
        <div v-if="isSpread(s)" class="thist__body">
          <p class="thist__top">
            <strong>{{ s.spreadName }}</strong>
            <span class="thist__muted">{{ dateLabel(s.createdAt) }}</span>
            <span v-if="s.source !== 'ai'" class="thist__badge">无 AI 解读</span>
          </p>
          <p class="thist__cards">
            <span v-for="slot in s.slots" :key="slot.index" class="thist__chip">
              {{ slot.slotName }}·{{ slot.cardName }}{{ slot.reversed ? '逆' : '' }}
            </span>
          </p>
          <p v-if="s.reading" class="thist__text">{{ s.reading }}</p>
        </div>
      </li>
    </ul>

    <button v-if="hasMore" class="thist__more" :disabled="loading" @click="load(false)">
      {{ loading ? '加载中…' : '加载更多' }}
    </button>
  </div>
</template>

<style scoped>
.thist { min-width: 0; }
.thist__hint { color: var(--muted); font-size: 13px; text-align: center; padding: 20px 0; }

.thist__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 45, 85, 0.35);
  background: rgba(255, 45, 85, 0.08);
  color: #ff8fa3;
  font-size: 13px;
}

.thist__tabs { display: flex; gap: 8px; margin-bottom: 14px; }

.thist__tabs button {
  padding: 6px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}

.thist__tabs button.is-active {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.4);
  background: rgba(0, 240, 255, 0.12);
}

.thist__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

.thist__item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}

.thist__thumb { flex: 0 0 52px; width: 52px; border-radius: 5px; border: 1px solid var(--line); }
.thist__body { min-width: 0; flex: 1; }

.thist__top { margin: 0 0 6px; display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; align-items: baseline; }
.thist__top strong { font-size: 13px; letter-spacing: 0.04em; }
.thist__muted { color: var(--muted); font-size: 11px; }

.thist__badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--yellow, #ffe45c);
  border: 1px solid rgba(255, 228, 92, 0.4);
}

.thist__cards { margin: 0 0 6px; display: flex; flex-wrap: wrap; gap: 4px; }

.thist__chip {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.05);
}

.thist__text {
  margin: 0;
  font-size: 12px;
  line-height: 1.85;
  color: var(--text);
  white-space: pre-wrap;
  /* 历史条目很长时截断，避免一屏全是文字 */
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.thist__more {
  margin-top: 14px;
  width: 100%;
  padding: 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}

.thist__more:hover:not(:disabled) { color: var(--text); border-color: rgba(0, 240, 255, 0.35); }
.thist__more:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
