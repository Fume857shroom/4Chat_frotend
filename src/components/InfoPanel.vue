<script setup lang="ts">
import type { Announce } from '../api/chat/message'

defineProps<{
  title: string
  accent: string
  items?: Announce[]
  loading?: boolean
  error?: string | null
  count?: number
}>()

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  } catch {
    return ''
  }
}
</script>

<template>
  <section class="info-panel" :style="{ '--panel-accent': accent }">
    <header class="info-panel__header">
      <span class="info-panel__dot"></span>
      <h2>{{ title }}</h2>
      <!-- 标题行右侧自定义入口（如“查看全部”） -->
      <span v-if="$slots.extra" class="info-panel__extra">
        <slot name="extra" />
      </span>
      <span v-if="count !== undefined" class="info-panel__count">{{ count }}</span>
    </header>
    <div class="info-panel__body">
      <!-- Items mode -->
      <template v-if="items !== undefined">
        <p v-if="loading" class="info-panel__placeholder">加载中...</p>
        <p v-else-if="error" class="info-panel__error">{{ error }}</p>
        <div v-else-if="items.length > 0" class="announce-list">
          <article v-for="item in items" :key="item.id" class="announce-card">
            <header class="announce-card__header">
              <strong class="announce-card__title">{{ item.title }}</strong>
              <time class="announce-card__time">{{ formatShortTime(item.createdAt) }}</time>
            </header>
            <p class="announce-card__content">{{ item.content }}</p>
          </article>
        </div>
        <p v-else class="info-panel__placeholder">暂无公告</p>
      </template>
      <!-- Slot mode (fallback) -->
      <slot v-else />
    </div>
  </section>
</template>

<style scoped>
.info-panel {
  min-height: 0;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent),
    var(--panel);
}

.info-panel__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.info-panel__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--panel-accent);
  box-shadow: 0 0 16px var(--panel-accent);
}

.info-panel__header h2 {
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.info-panel__body {
  color: var(--muted);
  line-height: 1.7;
}

/* --- 遗留：当前模板未使用的列表样式 --- */
.meta-list,
.media-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.meta-list li,
.media-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.meta-list__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.8);
}

.notice-card {
  padding: 14px;
  border-left: 3px solid var(--pink);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

/* --- 公告列表 --- */
.announce-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.announce-card {
  padding: 12px;
  border-left: 3px solid var(--pink);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  overflow: hidden;
}

.announce-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.announce-card__title {
  font-size: 13px;
  color: var(--text);
  letter-spacing: 0.06em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.announce-card__time {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.announce-card__content {
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-panel__placeholder {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

.info-panel__error {
  color: var(--pink);
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

.info-panel__count {
  margin-left: auto;
  min-width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #02131a;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
}

.info-panel__extra {
  margin-left: auto;
  display: flex;
  align-items: center;
}
</style>
