<script setup lang="ts">
import { computed, ref } from 'vue'
import SearchPanel from '../../components/music/SearchPanel.vue'
import ShareDialog from '../../components/music/ShareDialog.vue'
import CoverArt from '../../components/music/CoverArt.vue'
import PlayerControls from '../../components/music/PlayerControls.vue'
import QueuePanel from '../../components/music/QueuePanel.vue'
import { usePlayerStore } from '../../stores/music/player'

// 搜索结果由 SearchPanel 自己持有（页面局部状态，不进 store）；
// 这块右栏只读 player store，不复制任何曲目/进度状态 ——
// 所以它和右下角的小播放器永远同步，任意一边操作另一边立刻跟着变。
const player = usePlayerStore()

const showShare = ref(false)

const statusText = computed(() => {
  if (player.error) {
    return '播放异常'
  }
  if (player.isLoading) {
    return '取址中'
  }
  if (!player.hasTrack) {
    return '待播放'
  }
  return player.isPlaying ? '播放中' : '已暂停'
})
</script>

<template>
  <div class="music-play">
    <div class="music-play__search">
      <SearchPanel />
    </div>

    <aside class="music-play__now">
      <header class="music-play__now-header">
        <h3 class="music-play__now-title">正在播放</h3>
        <span v-if="player.quality" class="music-play__chip">{{ player.quality }}</span>
      </header>

      <div v-if="player.displayTrack" class="music-play__now-body">
        <CoverArt
          :src="player.displayTrack.coverUrl"
          :seed="player.displayTrack.songmid"
          :text="player.displayTrack.title"
          :size="168"
          :radius="18"
        />

        <div class="music-play__song">
          <p class="music-play__name" :title="player.displayTrack.title">
            {{ player.displayTrack.title }}
          </p>
          <p class="music-play__artist" :title="player.displayTrack.artist">
            {{ player.displayTrack.artist }}
          </p>
        </div>

        <dl class="music-play__stats">
          <div class="music-play__stat">
            <dt>状态</dt>
            <dd :class="{ 'music-play__stat-value--error': !!player.error }">{{ statusText }}</dd>
          </div>
          <div class="music-play__stat">
            <dt>队列</dt>
            <dd>{{ player.queueLength }} 首</dd>
          </div>
        </dl>

        <p v-if="player.error" class="music-play__error">
          {{ player.error }}
          <button type="button" @click="player.resume()">重试</button>
        </p>

        <PlayerControls class="music-play__controls" />

        <button
          type="button"
          class="music-play__share"
          :disabled="!player.track || player.isLoading"
          @click="showShare = true"
        >
          分享这首歌
        </button>

        <p class="music-play__hint">
          这块面板与右下角的小播放器是同一份状态，两边操作互相同步；切子页不断音
        </p>

        <button
          v-if="player.miniDismissed"
          type="button"
          class="music-play__recall"
          @click="player.restoreMini()"
        >
          重新显示小播放器
        </button>
      </div>

      <QueuePanel v-if="player.queueLength" :max-height="260" class="music-play__queue" />

      <p v-else class="music-play__placeholder">
        还没有播放中的歌曲，从左侧搜索结果点一首开始试听
      </p>

      <ShareDialog
        v-if="showShare && player.track"
        :track="player.track"
        @success="showShare = false"
        @close="showShare = false"
      />
    </aside>
  </div>
</template>

<style scoped>
.music-play {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(260px, 3fr);
  gap: 20px;
  height: 100%;
  min-height: 0;
}

.music-play__search {
  min-width: 0;
  min-height: 0;
}

.music-play__search > * {
  height: 100%;
}

/* --- 右侧：正在播放 --- */
.music-play__now {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.05), transparent 30%),
    var(--panel);
  box-shadow: var(--shadow);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.music-play__now::-webkit-scrollbar {
  width: 6px;
}

.music-play__now::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.music-play__now-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.music-play__now-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--cyan), var(--yellow));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.music-play__chip {
  margin-left: auto;
  padding: 2px 8px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 999px;
  color: var(--cyan);
  font-size: 11px;
}

.music-play__now-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.music-play__song {
  min-width: 0;
  width: 100%;
}

.music-play__name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-play__artist {
  margin-top: 3px;
  color: var(--muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- 状态 / 进度 --- */
.music-play__stats {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 0;
}

.music-play__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 92px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--panel-soft);
}

.music-play__stat dt {
  color: var(--muted);
  font-size: 11px;
}

.music-play__stat dd {
  margin: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.music-play__stat-value--error {
  color: var(--pink);
}

.music-play__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 45, 85, 0.24);
  border-radius: 12px;
  background: rgba(255, 45, 85, 0.12);
  color: #fff2f5;
  font-size: 12px;
  text-align: left;
}

.music-play__error button {
  flex-shrink: 0;
  padding: 3px 10px;
  border: 1px solid var(--pink);
  border-radius: 8px;
  background: transparent;
  color: var(--pink);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.music-play__error button:hover {
  background: rgba(255, 45, 85, 0.14);
}

.music-play__share {
  width: 100%;
  padding: 11px 18px;
  border: 0;
  border-radius: 14px;
  color: #081017;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.music-play__share:hover:not(:disabled) {
  transform: translateY(-1px);
}

.music-play__share:disabled {
  opacity: 0.6;
  cursor: wait;
}

.music-play__hint {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
}

/* 控件与队列：宽度跟着右栏走，别把面板撑出横向滚动 */
.music-play__controls,
.music-play__queue {
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.music-play__recall {
  padding: 7px 14px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.music-play__recall:hover {
  background: rgba(0, 240, 255, 0.16);
}

.music-play__placeholder {
  padding: 30px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 1100px) {
  .music-play {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .music-play__search > * {
    height: auto;
    min-height: 320px;
  }
}
</style>
