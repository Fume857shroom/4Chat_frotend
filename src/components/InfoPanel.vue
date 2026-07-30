<script setup lang="ts">
import type { Announce } from '../api/announce'

defineProps<{
  title: string
  accent: string
  items?: Announce[]
  loading?: boolean
  error?: string | null
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
