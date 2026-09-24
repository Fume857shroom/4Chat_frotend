<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CoverArt from '../../components/music/CoverArt.vue'
import FavoriteButton from '../../components/music/FavoriteButton.vue'
import { usePlaylistStore } from '../../stores/music/playlist'
import { usePlayerStore } from '../../stores/music/player'
import type { MusicPlaylistItem } from '../../types/music'

// 左：我的收藏（scope='user' 那条歌单的条目）；右：服务器歌单列表 ⇄ 明细。
// 明细用当前页内切换，不再加一层路由 —— 侧栏已经有三个栏目了。
const playlist = usePlaylistStore()
const player = usePlayerStore()

const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
/** 删除是「点一次变确认，再点才删」，不额外开确认弹窗 */
const pendingDelete = ref(0)

const inDetail = computed(() => playlist.currentId !== 0)
const favoriteCount = computed(() => playlist.favItems.length)
/** 明细里的「从我的收藏加进来」：已经在这条歌单里的就不列了 */
const addable = computed(() => {
  const inCurrent = new Set((playlist.current?.list ?? []).map((item) => item.songmid))

  return playlist.favItems.filter((item) => !inCurrent.has(item.songmid))
})

onMounted(() => {
  // 进页面拉一次：列表（含我的那条）+ 我的收藏条目，★ 的点亮态也来自这一份
  void playlist.fetchFavorites(true)
})

async function onSubmitCreate() {
  const name = newName.value.trim()

  if (!name || creating.value) {
    return
  }

  creating.value = true

  try {
    const created = await playlist.createPlaylist(name)

    if (created) {
      newName.value = ''
      showCreate.value = false
    }
  } finally {
    creating.value = false
  }
}

function onCancelCreate() {
  showCreate.value = false
  newName.value = ''
}

function onOpen(id: number) {
  pendingDelete.value = 0
  void playlist.openCurrent(id)
}

function onBack() {
  playlist.closeCurrent()
  pendingDelete.value = 0
}

async function onDelete(id: number) {
  if (pendingDelete.value !== id) {
    pendingDelete.value = id
    return
  }

  pendingDelete.value = 0
  await playlist.removePlaylist(id)
}

// 点整行 = 从这一首开始把整个列表排成队列播（playTrack 会认队列里的位置，不会另起一沓）
function onPlayFavorite(index: number) {
  playlist.playFavorites(index)
}

function onPlayCurrent(index: number) {
  playlist.playCurrent(index)
}

function onPickFromFavorites(item: MusicPlaylistItem) {
  if (playlist.currentId) {
    void playlist.addItem(playlist.currentId, item.songmid)
  }
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

// 秒 → m:ss
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '--:--'
  }
  const mm = Math.floor(seconds / 60)
  const ss = Math.floor(seconds % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}

// 加入时间：列表里放不下一整串 ISO，取到分钟
function dayLabel(iso: string): string {
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) {
    return ''
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
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
        <li
          v-for="(item, index) in playlist.favItems"
          :key="item.id"
          class="fav-row"
          :class="{ 'fav-row--current': isPlayingNow(item.songmid) }"
        >
          <button
            type="button"
            class="fav-row__main"
            :title="`从这一首开始播放我的收藏`"
            @click="onPlayFavorite(index)"
          >
            <CoverArt
              :src="item.coverUrl"
              :seed="item.songmid"
              :text="item.title"
              :size="40"
              :radius="10"
            />
            <span class="fav-row__info">
              <span class="fav-row__name">{{ item.title }}</span>
              <span class="fav-row__sub">
                {{ item.artist }} · {{ item.addedName }}加入于 {{ dayLabel(item.addedAt) }}
              </span>
            </span>
            <span v-if="item.hasLocal" class="fav-row__chip">本地</span>
            <span class="fav-row__duration">{{ formatDuration(item.duration) }}</span>
          </button>

          <button
            type="button"
            class="fav-row__leave"
            title="从我的收藏移出"
            @click="onLeave(item)"
          >
            ✕
          </button>
        </li>
      </ul>
    </section>

    <!-- 右：服务器歌单（列表 ⇄ 明细） -->
    <section class="favorites__panel">
      <header v-if="!inDetail" class="favorites__head">
        <h3 class="favorites__title">服务器歌单</h3>
        <span class="favorites__count">{{ playlist.siteLists.length }} 个</span>
        <button type="button" class="favorites__play-all" @click="showCreate = !showCreate">
          {{ showCreate ? '收起' : '新建歌单' }}
        </button>
      </header>

      <form v-if="showCreate && !inDetail" class="favorites__create" @submit.prevent="onSubmitCreate">
        <label class="favorites__create-field">
          <span class="sr-only">歌单名称</span>
          <input
            v-model="newName"
            type="text"
            maxlength="30"
            placeholder="歌单名称，如：今晚循环这几首"
            :disabled="creating"
          />
        </label>
        <button type="submit" class="favorites__create-submit" :disabled="creating || !newName.trim()">
          {{ creating ? '创建中...' : '创建' }}
        </button>
        <button type="button" class="favorites__create-cancel" @click="onCancelCreate">取消</button>
      </form>

      <!-- 列表模式 -->
      <template v-if="!inDetail">
        <p v-if="playlist.loading && !playlist.siteLists.length" class="favorites__tip">加载中...</p>
        <p v-else-if="playlist.error" class="favorites__tip favorites__tip--error">
          {{ playlist.error }}
        </p>
        <p v-else-if="!playlist.siteLists.length" class="favorites__tip">还没有服务器歌单，建一个吧</p>

        <ul v-else class="favorites__cards">
          <li v-for="list in playlist.siteLists" :key="list.id">
            <div class="playlist-card">
              <button
                type="button"
                class="playlist-card__main"
                :title="`查看歌单 ${list.name}`"
                @click="onOpen(list.id)"
              >
                <span class="playlist-card__name">{{ list.name }}</span>
                <span class="playlist-card__meta">{{ list.itemCount }} 首</span>
                <span class="playlist-card__by">by {{ list.createdByName }}</span>
              </button>
              <button
                v-if="list.canDelete"
                type="button"
                class="playlist-card__del"
                :class="{ 'playlist-card__del--sure': pendingDelete === list.id }"
                :title="pendingDelete === list.id ? '再点一次确认删除' : '删除歌单'"
                @click="onDelete(list.id)"
              >
                {{ pendingDelete === list.id ? '确认删除' : '删除' }}
              </button>
            </div>
          </li>
        </ul>
      </template>

      <!-- 明细模式 -->
      <template v-else>
        <header class="favorites__head">
          <button type="button" class="favorites__back" title="返回歌单列表" @click="onBack">
            ‹ 返回
          </button>
          <h3 class="favorites__title" :title="playlist.current?.name">
            {{ playlist.current?.name }}
          </h3>
          <span class="favorites__count">{{ playlist.current?.list.length ?? 0 }} 首</span>
          <button
            type="button"
            class="favorites__play-all"
            :disabled="!playlist.current?.list.length"
            @click="onPlayCurrent(0)"
          >
            ▶ 播放全部
          </button>
        </header>

        <p v-if="playlist.currentLoading" class="favorites__tip">加载中...</p>
        <p v-else-if="playlist.currentError" class="favorites__tip favorites__tip--error">
          {{ playlist.currentError }}
        </p>

        <ul v-if="playlist.current?.list.length" class="favorites__list">
          <li
            v-for="(item, index) in playlist.current.list"
            :key="item.id"
            class="fav-row"
            :class="{ 'fav-row--current': isPlayingNow(item.songmid) }"
          >
            <button
              type="button"
              class="fav-row__main"
              :title="`从这一首开始播放这个歌单`"
              @click="onPlayCurrent(index)"
            >
              <CoverArt
                :src="item.coverUrl"
                :seed="item.songmid"
                :text="item.title"
                :size="40"
                :radius="10"
              />
              <span class="fav-row__info">
                <span class="fav-row__name">{{ item.title }}</span>
                <span class="fav-row__sub">
                  {{ item.artist }} · {{ item.addedName }}加入于 {{ dayLabel(item.addedAt) }}
                </span>
              </span>
              <span v-if="item.hasLocal" class="fav-row__chip">本地</span>
              <span class="fav-row__duration">{{ formatDuration(item.duration) }}</span>
            </button>

            <!-- 歌单里的每条也能 ★ 进我的收藏 -->
            <FavoriteButton :songmid="item.songmid" :track-title="item.title" />

            <button
              type="button"
              class="fav-row__leave"
              title="移出这个歌单"
              @click="playlist.removeItem(playlist.currentId, item.songmid)"
            >
              ✕
            </button>
          </li>
        </ul>

        <!-- 加歌：契约里只有「按 songmid 加」，所以从我的收藏里挑 -->
        <div v-if="playlist.current && addable.length" class="favorites__add">
          <p class="favorites__add-title">从我的收藏加进来</p>
          <ul class="favorites__add-list">
            <li v-for="item in addable.slice(0, 8)" :key="item.id">
              <button
                type="button"
                class="favorites__add-row"
                :title="`把 ${item.title} 加入本歌单`"
                @click="onPickFromFavorites(item)"
              >
                <span class="favorites__add-name">{{ item.title }}</span>
                <span class="favorites__add-artist">{{ item.artist }}</span>
                <span class="favorites__add-plus">＋</span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </section>
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

.favorites__back {
  flex-shrink: 0;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel-soft);
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s;
}

.favorites__back:hover {
  color: var(--text);
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

/* --- 新建歌单 --- */
.favorites__create {
  display: flex;
  gap: 8px;
}

.favorites__create-field {
  flex: 1;
  min-width: 0;
}

.favorites__create input {
  width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  outline: none;
}

.favorites__create input:focus {
  border-color: rgba(0, 240, 255, 0.7);
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.12);
}

.favorites__create-submit,
.favorites__create-cancel {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.favorites__create-submit {
  border: 0;
  color: #081017;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
  font-weight: 700;
}

.favorites__create-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.favorites__create-cancel {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
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

.fav-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  transition:
    background 0.2s,
    border-color 0.2s;
}

.fav-row:hover {
  border-color: rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.07);
}

.fav-row--current {
  border-color: rgba(0, 240, 255, 0.5);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.06));
}

.fav-row__main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.fav-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.fav-row__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.fav-row__sub {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 12px;
}

.fav-row__chip {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid rgba(255, 228, 92, 0.4);
  border-radius: 999px;
  color: var(--yellow);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.fav-row__duration {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

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

/* --- 服务器歌单卡片 --- */
.favorites__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0 4px 0 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.playlist-card {
  display: flex;
  align-items: stretch;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  transition:
    border-color 0.2s,
    background 0.2s;
}

.playlist-card:hover {
  border-color: rgba(0, 240, 255, 0.35);
  background: rgba(0, 240, 255, 0.06);
}

.playlist-card__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding: 14px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.playlist-card__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
}

.playlist-card__meta {
  color: var(--cyan);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.playlist-card__by {
  color: var(--muted);
  font-size: 11px;
}

.playlist-card__del {
  flex-shrink: 0;
  width: 32px;
  padding: 0 6px;
  border: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.playlist-card__del:hover {
  color: var(--pink);
  background: rgba(255, 45, 85, 0.1);
}

.playlist-card__del--sure {
  width: auto;
  color: #fff2f5;
  background: rgba(255, 45, 85, 0.28);
}

/* --- 明细里的「从我的收藏加进来」 --- */
.favorites__add {
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.favorites__add-title {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.favorites__add-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.favorites__add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.favorites__add-row:hover {
  border-color: rgba(0, 240, 255, 0.4);
  background: rgba(0, 240, 255, 0.06);
}

.favorites__add-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorites__add-artist {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}

.favorites__add-plus {
  flex-shrink: 0;
  color: var(--cyan);
  font-size: 14px;
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
