<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getCardDetail, getCards, type TarotCardDetail, type TarotCardIndex } from '../../api/fun/tarot'
import { errorText } from '../../composables/errorText'
import TarotCard from './TarotCard.vue'

// 牌面图鉴：22 张大阿尔卡那 + 原画师长篇解读。纯静态，不调 AI、不落库。
const cards = ref<TarotCardIndex[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const activeId = ref<number | null>(null)
const detail = ref<TarotCardDetail | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await getCards()
    cards.value = res.data.data ?? []
  } catch (e) {
    error.value = errorText(e, '牌面列表加载失败')
  } finally {
    loading.value = false
  }
}

async function open(id: number) {
  // 再点一次同一张 = 收起
  if (activeId.value === id) {
    activeId.value = null
    detail.value = null
    return
  }
  activeId.value = id
  detail.value = null
  try {
    const res = await getCardDetail(id)
    detail.value = res.data.data ?? null
  } catch (e) {
    error.value = errorText(e, '牌面详解加载失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="tcodex">
    <p v-if="error" class="tcodex__error">{{ error }}</p>
    <p v-if="loading" class="tcodex__hint">加载中…</p>

    <div v-else class="tcodex__grid">
      <button
        v-for="c in cards"
        :key="c.id"
        class="tcodex__cell"
        :class="{ 'is-active': c.id === activeId }"
        @click="open(c.id)"
      >
        <TarotCard :pic="c.pic" :name="c.nameCn" size="sm" />
      </button>
    </div>

    <div v-if="activeId !== null" class="tcodex__detail">
      <p v-if="!detail" class="tcodex__hint">读取详解…</p>
      <template v-else>
        <div class="tcodex__head">
          <img class="tcodex__img" :src="detail.pic" :alt="detail.nameCn" loading="lazy" />
          <div class="tcodex__meta">
            <h3>{{ detail.nameCn }}</h3>
            <p class="tcodex__en">{{ detail.nameEn }}</p>
            <p class="tcodex__tag">正位</p>
            <p class="tcodex__line">{{ detail.meaningUp }}</p>
            <p class="tcodex__tag">逆位</p>
            <p class="tcodex__line">{{ detail.meaningDown }}</p>
          </div>
        </div>

        <h4 class="tcodex__sub">今日提示</h4>
        <p class="tcodex__para">{{ detail.readingUp }}</p>
        <p class="tcodex__para">{{ detail.readingDown }}</p>

        <h4 class="tcodex__sub">原画师解读</h4>
        <p class="tcodex__credit">原画 shi0n_krbn · 译 CedarLullaby</p>
        <p v-for="(p, i) in detail.lore" :key="i" class="tcodex__para">{{ p }}</p>
      </template>
      <button class="tcodex__close" @click="activeId = null">收起</button>
    </div>
  </div>
</template>

<style scoped>
.tcodex { min-width: 0; }
.tcodex__hint { color: var(--muted); font-size: 13px; }

.tcodex__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 45, 85, 0.35);
  background: rgba(255, 45, 85, 0.08);
  color: #ff8fa3;
  font-size: 13px;
}

.tcodex__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 10px;
}

.tcodex__cell {
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}
.tcodex__cell:hover { transform: translateY(-3px); }
.tcodex__cell.is-active { border-color: rgba(0, 240, 255, 0.5); }

.tcodex__detail {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.02);
}

.tcodex__head { display: flex; gap: 18px; align-items: flex-start; }
.tcodex__img { flex: 0 0 132px; width: 132px; border-radius: 8px; border: 1px solid var(--line); }
.tcodex__meta { min-width: 0; }

.tcodex__meta h3 {
  margin: 0 0 2px;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.08em;
}

.tcodex__en { margin: 0 0 12px; font-size: 12px; letter-spacing: 0.1em; color: var(--muted); }
.tcodex__tag { margin: 0 0 3px; font-size: 11px; letter-spacing: 0.14em; color: var(--cyan, #00f0ff); }
.tcodex__line { margin: 0 0 10px; font-size: 13px; line-height: 1.7; }
.tcodex__sub { margin: 18px 0 8px; font-size: 13px; letter-spacing: 0.12em; color: var(--yellow, #ffe45c); }

/* 后端要求模型输出纯文本，这里保留换行，绝不用 v-html */
.tcodex__para { margin: 0 0 10px; font-size: 13px; line-height: 1.95; white-space: pre-wrap; }

.tcodex__credit { margin: 0 0 10px; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; }

.tcodex__close {
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 720px) {
  .tcodex__grid { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }
  .tcodex__head { flex-direction: column; align-items: center; }
}
</style>
