<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NowPlayingBar from '../../components/music/NowPlayingBar.vue'

const route = useRoute()

// 歌板块栏目：每个一行，纵向排布
const features = [
  { to: '/music/play', icon: '🎵', name: '音乐播放' },
  { to: '/music/rank', icon: '🏆', name: '分享排行' },
]

// 兜底：/music 索引路由已由 router 默认重定向到 play，仍保留空状态分支与「乐/禁」一致
const isHome = computed(() => route.name === 'music')
</script>

<template>
  <div class="music-layout">
    <!-- 左侧功能栏目 -->
    <aside class="music-nav">
      <h2 class="music-nav__title">歌</h2>
      <nav class="music-nav__list" aria-label="音乐功能">
        <RouterLink
          v-for="f in features"
          :key="f.to"
          :to="f.to"
          class="music-nav__item"
          active-class="is-active"
        >
          <span class="music-nav__icon">{{ f.icon }}</span>
          <span class="music-nav__name">{{ f.name }}</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- 右侧功能区：子路由渲染 -->
    <section class="music-stage">
      <router-view v-if="!isHome" />
      <div v-else class="music-empty">
        <span class="music-empty__icon">🎵</span>
        <p class="music-empty__text">从左侧选择一个功能开始</p>
      </div>
    </section>

    <!-- 播放条：两个子页共用同一 player store，切页不断音 -->
    <NowPlayingBar />
  </div>
</template>

<style scoped>
.music-layout {
  display: flex;
  gap: 24px;
  height: 100%;
  min-height: 0;
}

/* --- 左侧功能栏目 --- */
.music-nav {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 200px;
  flex-shrink: 0;
  padding: 20px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.06), transparent 30%),
    var(--panel-strong);
}

.music-nav__title {
  padding: 0 10px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.14em;
  background: linear-gradient(120deg, var(--cyan), var(--pink));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.music-nav__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.music-nav__item {
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

.music-nav__item:hover,
.music-nav__item.is-active {
  color: var(--text);
  border-color: rgba(0, 240, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.08));
}

.music-nav__icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.music-nav__name {
  letter-spacing: 0.04em;
}

/* --- 右侧功能区（底部留出自定义播放条的高度，不被遮挡） --- */
.music-stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding-bottom: 76px;
  overflow: hidden;
}

.music-empty {
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

.music-empty__icon {
  font-size: 44px;
  filter: grayscale(0.4);
  opacity: 0.6;
}

.music-empty__text {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.08em;
}

@media (max-width: 900px) {
  .music-stage {
    padding-bottom: 118px;
  }
}
</style>
