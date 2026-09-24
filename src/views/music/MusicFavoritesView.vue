<script setup lang="ts">
import { computed, onMounted } from 'vue'
import PlaylistBoard from '../../components/music/PlaylistBoard.vue'
import PlaylistRow from '../../components/music/PlaylistRow.vue'
import { usePlaylistStore } from '../../stores/music/playlist'
import { usePlayerStore } from '../../stores/music/player'
import type { MusicPlaylistItem } from '../../types/music'

// 左：我的收藏（scope='user' 那条歌单的条目）；右：服务器歌单列表 ⇄ 明细整块交给 PlaylistBoard。
// 两栏的行是同一种东西，所以都走 PlaylistRow，尾部的 ✕ / ★ 语义不同，留在各自父级里。
const playlist = usePlaylistStore()
const player = usePlayerStore()

const favoriteCount = computed(() => playlist.favItems.length)

onMounted(() => {
  // 进页面拉一次：列表（含我的那条）+ 我的收藏条目，★ 的点亮态也来自这一份
  void playlist.fetchFavorites(true)
})

// 点整行 = 从这一首开始把整个列表排成队列播（playTrack 会认队列里的位置，不会另起一沓）
function onPlayFavorite(index: number) {
  playlist.playFavorites(index)
}

function onLeave(item: MusicPlaylistItem) {
  const mine = playlist.favorites

  if (mine) {
    void playlist.removeItem(mine.id, item.songmid)
  }
}

function isPlayingNow(songmid: string): boolean {
  return player.track?.songmid === songmid
}
</script>

<template>
  <div class="favorites">
    <!-- 左：我的收藏 -->
    <section class="favorites__panel favorites__panel--mine">
      <header class="favorites__head">
        <h3 class="favorites__title">我的收藏</h3>
        <span class="favorites__count">{{ favoriteCount }} 首</span>
        <button
          type="button"
          class="favorites__play-all"
          :disabled="!favoriteCount"
          @click="onPlayFavorite(0)"
        >
          ▶ 播放全部
        </button>
      </header>

      <p v-if="playlist.favLoading && !favoriteCount" class="favorites__tip">加载中...</p>
      <p v-else-if="playlist.favError" class="favorites__tip favorites__tip--error">
        {{ playlist.favError }}
      </p>
      <p v-else-if="!favoriteCount" class="favorites__tip">
        还没有收藏，去「分享排行」「音乐播放」那些列表里点 ★
      </p>

      <ul v-else class="favorites__list">
        <PlaylistRow
          v-for="(item, index) in playlist.favItems"
          :key="item.id"
          :item="item"
          :playing="isPlayingNow(item.songmid)"
          :main-title="`从这一首开始播放我的收藏`"
          @play="onPlayFavorite(index)"
        >
          <button
            type="button"
            class="fav-row__leave"
            title="从我的收藏移出"
            @click="onLeave(item)"
          >
            ✕
          </button>
        </PlaylistRow>
      </ul>
    </section>

    <!-- 右：服务器歌单（列表 ⇄ 明细） -->
    <PlaylistBoard />
  </div>
</template>

<style scoped>
.favorites {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 20px;
  height: 100%;
  min-height: 0;
}

.favorites__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.05), transparent 30%),
    var(--panel);
  box-shadow: var(--shadow);
}

.favorites__panel--mine {
  background:
    linear-gradient(180deg, rgba(255, 228, 92, 0.06), transparent 30%),
    var(--panel);
}

.favorites__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.favorites__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--yellow), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.favorites__count {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.favorites__play-all {
  margin-left: auto;
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.favorites__play-all:hover:not(:disabled) {
  background: rgba(0, 240, 255, 0.16);
}

.favorites__play-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.favorites__tip {
  padding: 22px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.favorites__tip--error {
  color: var(--pink);
}

/* --- 条目列表 --- */
.favorites__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0 4px 0 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.favorites__list::-webkit-scrollbar {
  width: 6px;
}

.favorites__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

/* 移出收藏的 ✕ 是传进 PlaylistRow 的 slot、编译在本组件，
   样式得跟着父级走：放进 PlaylistRow 的 scoped 里选不中（slot 内容带的是父级 scope id） */
.fav-row__leave {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-right: 8px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.fav-row__leave:hover {
  color: var(--pink);
  background: rgba(255, 45, 85, 0.12);
}

@media (max-width: 1100px) {
  .favorites {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .favorites__panel {
    min-height: 320px;
  }
}
</style>
