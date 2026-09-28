<script setup lang="ts">
import { ref } from 'vue'
import TarotDaily from '../../components/fun/TarotDaily.vue'
import TarotDivination from '../../components/fun/TarotDivination.vue'
import TarotCodex from '../../components/fun/TarotCodex.vue'
import TarotHistory from '../../components/fun/TarotHistory.vue'

type TabKey = 'daily' | 'spread' | 'codex' | 'history'

const TABS: { key: TabKey; name: string }[] = [
  { key: 'daily', name: '每日一抽' },
  { key: 'spread', name: '牌阵占卜' },
  { key: 'codex', name: '牌面图鉴' },
  { key: 'history', name: '历史记录' },
]

const tab = ref<TabKey>('daily')
</script>

<template>
  <div class="tarot">
    <header class="tarot__head">
      <h2 class="tarot__title">塔罗</h2>
      <nav class="tarot__tabs" aria-label="塔罗功能">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="tarot__tab"
          :class="{ 'is-active': tab === t.key }"
          @click="tab = t.key"
        >
          {{ t.name }}
        </button>
      </nav>
    </header>

    <div class="tarot__body">
      <!-- keep-alive 保住各面板状态：切走再切回来不必重新抽牌、重新翻牌 -->
      <KeepAlive>
        <TarotDaily v-if="tab === 'daily'" />
        <TarotDivination v-else-if="tab === 'spread'" />
        <TarotCodex v-else-if="tab === 'codex'" />
        <TarotHistory v-else />
      </KeepAlive>
    </div>

    <p class="tarot__note">牌面与解读仅供自我梳理与娱乐，不构成任何医疗、法律或投资建议。</p>
  </div>
</template>

<style scoped>
.tarot {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(ellipse at 20% 0%, rgba(120, 80, 255, 0.09), transparent 55%),
    var(--panel-strong);
}

.tarot__head {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.tarot__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.14em;
  background: linear-gradient(120deg, var(--yellow), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.tarot__tabs { display: flex; gap: 6px; flex-wrap: wrap; }

.tarot__tab {
  padding: 7px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.tarot__tab:hover,
.tarot__tab.is-active {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.08));
}

.tarot__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 滚动条做成透明的：默认那根灰白条在这个深色星空底上很突兀。
   用 :deep 覆盖到所有子面板的滚动容器（主内容区、牌阵选择列表）。
   轨道全透明，滑块只留一点微光——完全隐掉的话用户不知道还能往下滚 */
.tarot :deep(*) {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}

.tarot :deep(*)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.tarot :deep(*)::-webkit-scrollbar-track {
  background: transparent;
}

.tarot :deep(*)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 3px;
}

.tarot :deep(*)::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 240, 255, 0.3);
}

.tarot :deep(*)::-webkit-scrollbar-corner {
  background: transparent;
}

.tarot__note {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-align: center;
}
</style>
