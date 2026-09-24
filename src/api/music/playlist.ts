// ==========================================
// src/api/music/playlist.ts
// 歌单接口层：列表 / 新建（只建服务器歌单）/ 明细 / 加歌 / 移歌 / 删单
// 「我的收藏」不是另一套接口 —— 它就是 scope 为 'user' 的那条歌单，
// 加歌移歌走同样的 items 端点，只是 playlistId 换成我自己的那条。
// ==========================================
import http from '../http'
import type { Envelope } from '../http'
import type { MusicPlaylistDetail, MusicPlaylistItem, MusicPlaylistSummary } from '../../types/music'

/** 我可见的全部歌单（我的收藏 + 服务器歌单，靠 scope 区分） */
export async function fetchPlaylists(): Promise<MusicPlaylistSummary[]> {
  const res = await http.get<Envelope<MusicPlaylistSummary[]>>('/api/v1/music/playlists')
  return res.data.data ?? []
}

/** 新建服务器歌单（后端 201 返回建好的那一条） */
export async function createPlaylist(name: string): Promise<MusicPlaylistSummary> {
  const res = await http.post<Envelope<MusicPlaylistSummary>>('/api/v1/music/playlists', { name })
  return res.data.data!
}

/** 歌单明细（含条目列表） */
export async function fetchPlaylist(id: number): Promise<MusicPlaylistDetail> {
  const res = await http.get<Envelope<MusicPlaylistDetail>>(`/api/v1/music/playlists/${id}`)
  return res.data.data!
}

/** 往歌单里加一首（后端 201 返回新条目） */
export async function addPlaylistItem(id: number, songmid: string): Promise<MusicPlaylistItem> {
  const res = await http.post<Envelope<MusicPlaylistItem>>(`/api/v1/music/playlists/${id}/items`, {
    songmid,
  })
  return res.data.data!
}

/** 从歌单里移出一首 */
export async function removePlaylistItem(id: number, songmid: string): Promise<void> {
  await http.post<Envelope<{ removed: boolean }>>(`/api/v1/music/playlists/${id}/items/remove`, {
    songmid,
  })
}

/** 删除整个歌单（仅服务器歌单的创建者可删） */
export async function deletePlaylist(id: number): Promise<void> {
  await http.delete<Envelope<null>>(`/api/v1/music/playlists/${id}`)
}
