// ==========================================
// src/stores/music/playlist.ts
// 歌单状态：列表（我的收藏 + 服务器歌单）、当前歌单明细、条目增删、整单播放
//
// 一个要点：「我的收藏」不是另一套接口，它就是 scope='user' 的那条歌单，
// 加歌移歌都走 /playlists/:id/items，只是 :id 换成我自己那条 ——
// 所以收藏态只需要一份 songmid 集合，各页面的 ★ 与「我的收藏」子页都读这里。
// ==========================================
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  MusicPlaylistDetail,
  MusicPlaylistItem,
  MusicPlaylistSummary,
  PlayableTrack,
} from '../../types/music'
import {
  addPlaylistItem as apiAddItem,
  createPlaylist as apiCreatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  fetchPlaylist as apiFetchPlaylist,
  fetchPlaylists as apiFetchPlaylists,
  removePlaylistItem as apiRemoveItem,
} from '../../api/music/playlist'
import { usePlayerStore } from './player'
import { showToast } from '../../composables/toast'

/** 歌单条目 → 播放器曲目：字段是 PlayableTrack 的子集，队列里不需要加入人/时间 */
function toTracks(items: MusicPlaylistItem[]): PlayableTrack[] {
  return items.map((item) => ({
    songmid: item.songmid,
    title: item.title,
    artist: item.artist,
    duration: item.duration,
    coverUrl: item.coverUrl,
  }))
}

/** 后端中文 message 优先（http 拦截器已挂到 error.message），拿不到才用兜底句 */
function messageOf(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

export const usePlaylistStore = defineStore('music-playlist', () => {
  // --- 列表 ---
  const lists = ref<MusicPlaylistSummary[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  /** scope='user' 的那一条；后端没给就是还没有收藏过，前端没有建它（也建不了）的入口 */
  const favorites = computed(() => lists.value.find((item) => item.scope === 'user') ?? null)
  const siteLists = computed(() => lists.value.filter((item) => item.scope === 'site'))

  // --- 我的收藏条目 ---
  const favItems = ref<MusicPlaylistItem[]>([])
  const favLoading = ref(false)
  const favLoaded = ref(false)
  const favError = ref<string | null>(null)
  const favoriteSongmids = computed(() => new Set(favItems.value.map((item) => item.songmid)))
  const favoriteTracks = computed(() => toTracks(favItems.value))

  // --- 当前查看的歌单明细（页内切换，不占路由） ---
  const current = ref<MusicPlaylistDetail | null>(null)
  const currentId = ref(0)
  const currentLoading = ref(false)
  const currentError = ref<string | null>(null)
  const currentTracks = computed(() => toTracks(current.value?.list ?? []))
  /** canDelete 只在列表接口里有，明细里没这个字段，用它查 */
  const canDeleteCurrent = computed(
    () => lists.value.find((item) => item.id === currentId.value)?.canDelete ?? false,
  )

  async function fetchLists(force = false): Promise<void> {
    if (loading.value || (loaded.value && !force)) {
      return
    }

    loading.value = true
    error.value = null

    try {
      lists.value = await apiFetchPlaylists()
      loaded.value = true
    } catch (e: unknown) {
      lists.value = []
      error.value = messageOf(e, '歌单列表加载失败')
    } finally {
      loading.value = false
    }
  }

  /** 拉我的收藏条目：进「歌」相关页面时调一次，★ 的点亮态全靠它 */
  async function fetchFavorites(force = false): Promise<void> {
    if (favLoading.value || (favLoaded.value && !force)) {
      return
    }

    favLoading.value = true
    favError.value = null

    try {
      await fetchLists(force)

      const mine = favorites.value

      if (!mine) {
        favItems.value = []
        favLoaded.value = true
        return
      }

      const detail = await apiFetchPlaylist(mine.id)
      favItems.value = detail.list
      favLoaded.value = true
    } catch (e: unknown) {
      favError.value = messageOf(e, '我的收藏加载失败')
    } finally {
      favLoading.value = false
    }
  }

  function isFavorite(songmid: string): boolean {
    return favoriteSongmids.value.has(songmid)
  }

  /**
   * 加歌 / 移歌。id 传我自己那条就是收藏，传服务器歌单就是歌单增删，
   * 文案与本地同步都按「是不是收藏」分流，省得每个入口各写一遍。
   */
  async function addItem(id: number, songmid: string): Promise<boolean> {
    const mine = id === favorites.value?.id

    try {
      const item = await apiAddItem(id, songmid)

      if (mine) {
        if (!isFavorite(songmid)) {
          favItems.value = [item, ...favItems.value]
        }
        showToast('已加入我的收藏')
      } else {
        if (current.value?.id === id && !current.value.list.some((row) => row.songmid === songmid)) {
          current.value = { ...current.value, list: [item, ...current.value.list] }
        }
        showToast('已加入服务器歌单')
      }

      syncItemCount(id, 1)
      return true
    } catch (e: unknown) {
      showToast(messageOf(e, mine ? '收藏失败' : '加入歌单失败'))
      return false
    }
  }

  async function removeItem(id: number, songmid: string): Promise<boolean> {
    const mine = id === favorites.value?.id

    try {
      await apiRemoveItem(id, songmid)

      // 只同步被真正操作的那一份，与 addItem 的分支保持对称：
      // 原先这里是无条件过滤 favItems，于是从服务器歌单移歌会把左栏「我的收藏」
      // 里同一首也抹掉（服务端并没动它），那颗 ★ 还会跟着错误地熄灭
      if (mine) {
        favItems.value = favItems.value.filter((row) => row.songmid !== songmid)
        showToast('已从我的收藏移除')
      } else if (current.value?.id === id) {
        current.value = {
          ...current.value,
          list: current.value.list.filter((row) => row.songmid !== songmid),
        }
        showToast('已移出歌单')
      }

      syncItemCount(id, -1)
      return true
    } catch (e: unknown) {
      showToast(messageOf(e, mine ? '取消收藏失败' : '移出歌单失败'))
      return false
    }
  }

  /** ★ 的一次点击：已在收藏里就移除，否则加进我的那条歌单 */
  async function toggleFavorite(songmid: string): Promise<boolean> {
    const mine = favorites.value

    if (!mine) {
      await fetchLists(true)
      const retry = favorites.value

      if (!retry) {
        // 契约里没有「新建我的收藏」的端点，这条只会在后端还没给我建好时出现
        showToast('还没有生成我的收藏，请稍后重试')
        return false
      }

      return toggleFavorite(songmid)
    }

    return isFavorite(songmid) ? removeItem(mine.id, songmid) : addItem(mine.id, songmid)
  }

  function syncItemCount(id: number, delta: number): void {
    lists.value = lists.value.map((item) =>
      item.id === id ? { ...item, itemCount: Math.max(0, item.itemCount + delta) } : item,
    )
  }

  // --- 服务器歌单 ---

  async function createPlaylist(name: string): Promise<MusicPlaylistSummary | null> {
    try {
      const created = await apiCreatePlaylist(name)
      lists.value = [...lists.value, created]
      return created
    } catch (e: unknown) {
      showToast(messageOf(e, '新建歌单失败'))
      return null
    }
  }

  async function removePlaylist(id: number): Promise<boolean> {
    try {
      await apiDeletePlaylist(id)
      lists.value = lists.value.filter((item) => item.id !== id)

      if (currentId.value === id) {
        closeCurrent()
      }

      return true
    } catch (e: unknown) {
      showToast(messageOf(e, '删除歌单失败'))
      return false
    }
  }

  async function openCurrent(id: number): Promise<void> {
    currentId.value = id
    currentLoading.value = true
    currentError.value = null

    try {
      current.value = await apiFetchPlaylist(id)
    } catch (e: unknown) {
      current.value = null
      // 后端这条的中文 message（歌单不存在 / 无权查看等）原样透出
      currentError.value = messageOf(e, '歌单加载失败')
    } finally {
      currentLoading.value = false
    }
  }

  function closeCurrent(): void {
    current.value = null
    currentId.value = 0
    currentError.value = null
  }

  // --- 起播：整单变成一个队列，来源文案由 player store 负责 ---

  function playFavorites(startIndex = 0): void {
    if (!favItems.value.length) {
      return
    }

    void usePlayerStore().playQueue(favoriteTracks.value, startIndex, 'favorites')
  }

  function playCurrent(startIndex = 0): void {
    const detail = current.value

    if (!detail || !detail.list.length) {
      return
    }

    void usePlayerStore().playQueue(toTracks(detail.list), startIndex, 'playlist', detail.name)
  }

  return {
    // state
    lists,
    loading,
    loaded,
    error,
    favorites,
    siteLists,
    favItems,
    favLoading,
    favLoaded,
    favError,
    favoriteTracks,
    favoriteSongmids,
    current,
    currentId,
    currentLoading,
    currentError,
    currentTracks,
    canDeleteCurrent,
    // actions
    fetchLists,
    fetchFavorites,
    isFavorite,
    addItem,
    removeItem,
    toggleFavorite,
    createPlaylist,
    removePlaylist,
    openCurrent,
    closeCurrent,
    playFavorites,
    playCurrent,
  }
})
