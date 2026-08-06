<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '../stores/user'
import { resolveAvatarUrl, avatarHue } from '../composables/avatar'

const userStore = useUserStore()

const items = [
  {
    to: '/chat',
    icon: 'C',
  },
]

// 底部个人中心头像入口
const avatarSrc = computed(() => resolveAvatarUrl(userStore.profile?.avatar))
const avatarText = computed(() => (userStore.profile?.nickname || '我').charAt(0))
const avatarStyle = computed(() => {
  if (avatarSrc.value) {
    return undefined
  }
  const hue = avatarHue(userStore.profile?.id ?? 'me')
  return {
    background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
  }
})
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

      <RouterLink to="/fun" class="app-sidebar__link" active-class="is-active" title="乐">
        <span class="app-sidebar__icon">乐</span>
      </RouterLink>
    </nav>

    <!-- 个人中心入口：头像随 profile.avatar 实时联动 -->
    <div class="app-sidebar__grow"></div>
    <RouterLink
      to="/profile"
      class="app-sidebar__avatar"
      active-class="is-active"
      title="个人中心"
    >
      <img v-if="avatarSrc" :src="avatarSrc" alt="个人头像" />
      <span v-else :style="avatarStyle">{{ avatarText }}</span>
    </RouterLink>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 100vh;
  padding: 28px 12px;
  border-right: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.06), transparent 28%),
    var(--panel-strong);
}

.app-sidebar__brand {
  display: flex;
  justify-content: center;
}

.app-sidebar__mark {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  font-family: var(--font-display);
  font-size: 22px;
  color: #02131a;
  background: linear-gradient(135deg, var(--cyan), var(--yellow));
}

.app-sidebar__nav {
  display: grid;
  gap: 8px;
}

.app-sidebar__link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.02);
  font: inherit;
  cursor: pointer;
}

.app-sidebar__link:hover,
.app-sidebar__link.is-active {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.08));
}

.app-sidebar__icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-family: var(--font-display);
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
}

.app-sidebar__grow {
  flex: 1;
}

.app-sidebar__avatar {
  display: flex;
  justify-content: center;
  padding: 10px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: border-color 0.2s, background 0.2s;
}

.app-sidebar__avatar img,
.app-sidebar__avatar > span {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.app-sidebar__avatar img {
  object-fit: cover;
  display: block;
}

.app-sidebar__avatar:hover,
.app-sidebar__avatar.is-active {
  border-color: rgba(0, 240, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.08));
}

@media (max-width: 720px) {
  .app-sidebar {
    display: none;
  }
}
</style>
