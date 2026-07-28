<script setup lang="ts">
const items = [
  {
    label: 'CHAT',
    hint: '实时会话',
    to: '/chat',
    icon: 'C',
  },
]
</script>

<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__brand">
      <span class="app-sidebar__mark">4C</span>
      <div>
        <p>4Chat</p>
        <span>Console</span>
      </div>
    </div>

    <nav class="app-sidebar__nav" aria-label="主功能">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="app-sidebar__link"
        active-class="is-active"
      >
        <span class="app-sidebar__icon">{{ item.icon }}</span>
        <span class="app-sidebar__copy">
          <strong>{{ item.label }}</strong>
          <small>{{ item.hint }}</small>
        </span>
      </RouterLink>
    </nav>
  </aside>
</template>
