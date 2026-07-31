<script setup lang="ts">
import { showToast } from '../composables/toast'

const items = [
  {
    to: '/chat',
    icon: 'C',
  },
]

function handleDevClick() {
  showToast('正在开发')
}
</script>

<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__brand">
      <span class="app-sidebar__mark">4C</span>
    </div>

    <nav class="app-sidebar__nav" aria-label="主功能">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="app-sidebar__link"
        active-class="is-active"
        :title="item.icon"
      >
        <span class="app-sidebar__icon">{{ item.icon }}</span>
      </RouterLink>

      <button type="button" class="app-sidebar__link" title="乐" @click="handleDevClick">
        <span class="app-sidebar__icon">乐</span>
      </button>
    </nav>
  </aside>
</template>
