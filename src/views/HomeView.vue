<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useOnlineStore } from '../stores/online'
import { sendDisconnect } from '../api/online'

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
