<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 禁漫功能栏目：每个一行，纵向排布
const features = [
  { to: '/jm/download', icon: '📥', name: '漫画下载' },
  { to: '/jm/official', icon: '🈲', name: '禁漫官方' },
]

// 直接访问 /jm 时右侧无子页面 → 显示空状态
const isHome = computed(() => route.name === 'jm')
</script>

<template>
  <div class="jm-layout">
    <!-- 左侧功能栏目 -->
    <aside class="jm-nav">
      <h2 class="jm-nav__title">禁</h2>
      <nav class="jm-nav__list" aria-label="禁漫功能">
        <RouterLink
          v-for="f in features"
          :key="f.to"
          :to="f.to"
          class="jm-nav__item"
          active-class="is-active"
        >
          <span class="jm-nav__icon">{{ f.icon }}</span>
          <span class="jm-nav__name">{{ f.name }}</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- 右侧功能区：子路由渲染 -->
    <section class="jm-stage">
      <router-view v-if="!isHome" />
      <div v-else class="jm-empty">
        <span class="jm-empty__icon">🈲</span>
        <p class="jm-empty__text">从左侧选择一个功能开始</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.jm-layout {
  display: flex;
  gap: 24px;
  height: 100%;
  min-height: 0;
}

/* --- 左侧功能栏目 --- */
.jm-nav {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 200px;
  flex-shrink: 0;
  padding: 20px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 45, 85, 0.06), transparent 30%),
    var(--panel-strong);
}

.jm-nav__title {
  padding: 0 10px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.14em;
  background: linear-gradient(120deg, var(--pink), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.jm-nav__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.jm-nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--muted);
  font-size: 14px;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.jm-nav__item:hover,
.jm-nav__item.is-active {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.08));
}

.jm-nav__icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.jm-nav__name {
  letter-spacing: 0.04em;
}

/* --- 右侧功能区 --- */
.jm-stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.jm-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.02);
}

.jm-empty__icon {
  font-size: 44px;
  filter: grayscale(0.4);
  opacity: 0.6;
}

.jm-empty__text {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.08em;
}
</style>
