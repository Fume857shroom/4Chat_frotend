<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useOnlineStore } from '../stores/chat/online'
import { sendDisconnect } from '../api/chat/online'

const onlineStore = useOnlineStore()

onMounted(() => {
  onlineStore.initOnlineService()

  window.addEventListener('pagehide', () => {
    sendDisconnect()
  })
})

onUnmounted(() => {
  onlineStore.destroyOnlineService()
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-shell__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
}

.app-shell__content {
  min-width: 0;
  padding: 28px;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .app-shell {
    grid-template-columns: 92px minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell__content {
    padding: 16px;
  }
}
</style>
