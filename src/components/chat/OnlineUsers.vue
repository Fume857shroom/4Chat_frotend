<script setup lang="ts">
import { useOnlineStore } from '../../stores/chat/online'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import InfoPanel from '../InfoPanel.vue'
import { resolveAvatarUrl, avatarHue } from '../../composables/avatar'

const onlineStore = useOnlineStore()
const authStore = useAuthStore()
const userStore = useUserStore()

// 自己的条目优先显示个人中心设置的新昵称
function displayNameOf(user: { id: number; username: string }): string {
  if (authStore.user?.id && user.id === authStore.user.id) {
    return userStore.profile?.nickname || user.username
  }
  return user.username
}

// 头像 URL：空值（未设置）时为空，显示占位符
function avatarOf(user: { id: number; username: string; avatar?: string }): string {
  return resolveAvatarUrl(user.avatar)
}

// 无头像时的占位符首字符
function avatarTextOf(user: { id: number; username: string }): string {
  return user.username.charAt(0) || '?'
}

// 无头像时的占位符背景：按 id 哈希取色
function avatarStyleOf(user: { id: number; username: string; avatar?: string }): Record<string, string> | undefined {
  if (avatarOf(user)) {
    return undefined
  }
  const hue = avatarHue(user.id)
  return {
    background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
  }
}
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
        <span
          class="online-users__avatar"
          :class="{ 'online-users__avatar--placeholder': !avatarOf(user) }"
          :style="avatarStyleOf(user)"
        >
          <img v-if="avatarOf(user)" :src="avatarOf(user)" alt="" />
          <template v-else>{{ avatarTextOf(user) }}</template>
        </span>
        <!-- 心情气泡：与个人中心一致的胶囊样式，未设置则保留绿点 -->
        <span v-if="user.status" class="online-users__status" :title="user.status">
          <span class="online-users__status-dot"></span>
          <span class="online-users__status-text">{{ user.status }}</span>
        </span>
        <span v-else class="online-users__dot"></span>
        <span class="online-users__name">{{ displayNameOf(user) }}</span>
      </li>
    </ul>

    <!-- Empty state -->
    <p v-else class="online-users__empty">
      当前暂无其他用户在线
    </p>
  </InfoPanel>
</template>

<style scoped>
.online-users__warning {
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--yellow);
  background: rgba(255, 228, 92, 0.08);
  border: 1px solid rgba(255, 228, 92, 0.24);
  font-size: 12px;
  margin-bottom: 10px;
}

.online-users__list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.online-users__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.online-users__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.8);
  flex-shrink: 0;
}

.online-users__avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.online-users__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.online-users__avatar--placeholder {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;
  font-weight: 600;
}

.online-users__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 心情气泡（与个人中心一致的胶囊样式，尺寸适配列表行高） */
.online-users__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  max-width: 160px;
  padding: 3px 10px;
  border: 1px solid rgba(255, 228, 92, 0.35);
  border-radius: 999px;
  background: rgba(255, 228, 92, 0.08);
  color: var(--yellow);
  font-size: 12px;
}

.online-users__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 6px rgba(255, 228, 92, 0.8);
  flex-shrink: 0;
}

.online-users__status-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.online-users__empty {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}
</style>