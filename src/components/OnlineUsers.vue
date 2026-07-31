<script setup lang="ts">
import { useOnlineStore } from '../stores/online'
import InfoPanel from './InfoPanel.vue'

const onlineStore = useOnlineStore()
</script>

<template>
  <InfoPanel title="在线用户" accent="#00f0ff" :count="onlineStore.totalCount">
    <!-- Connection lost warning -->
    <div
      v-if="onlineStore.connectionStatus === 'connection_lost'"
      class="online-users__warning"
    >
      网络连线异常，正在重连...
    </div>

    <!-- User list -->
    <ul class="online-users__list" v-if="onlineStore.onlineUsers.length > 0">
      <li
        v-for="user in onlineStore.onlineUsers"
        :key="user.id"
        class="online-users__item"
      >
        <span class="online-users__status"></span>
        <span class="online-users__name">{{ user.username }}</span>
      </li>
    </ul>

    <!-- Empty state -->
    <p v-else class="online-users__empty">
      当前暂无其他用户在线
    </p>
  </InfoPanel>
</template>
