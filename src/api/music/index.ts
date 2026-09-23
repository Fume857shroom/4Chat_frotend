// ==========================================
// src/api/music/index.ts
// 「歌」板块接口层：搜索 / 播放取址 / 分享 / 动态流 / 月榜
// 只在此处调 axios（走 http 实例：自动带 token、透出后端中文 message、401 跳登录）
// 注意：音频字节不经这里 —— 播放地址由前端直连腾讯 CDN
// ==========================================
import http from '../http'
import type { Envelope } from '../http'
import type {
  CreateShareDTO,
  MusicChartItem,
  MusicPlayInfo,
  MusicSearchItem,
  MusicShareItem,
  MusicSongDetail,
  UpdateShareDTO,
} from '../../types/music'

/** 搜索歌曲：keyword 为歌名（可带歌手名） */
export async function searchMusic(keyword: string): Promise<MusicSearchItem[]> {
  const res = await http.get<Envelope<MusicSearchItem[]>>('/api/v1/music/search', {
    params: { keyword },
  })
  return res.data.data ?? []
}

/**
 * 取播放地址。返回的 url 时效有限，调用方每次开始播放都要重新取，
 * 不要把结果缓存复用（缓存策略见 stores/music/player.ts）。
 */
export async function fetchPlayInfo(songmid: string): Promise<MusicPlayInfo> {
  const res = await http.post<Envelope<MusicPlayInfo>>('/api/v1/music/play', { songmid })
  return res.data.data!
}

/** 分享一首歌（打分 + 评语） */
export async function createShare(dto: CreateShareDTO): Promise<MusicShareItem> {
  const res = await http.post<Envelope<MusicShareItem>>('/api/v1/music/share', dto)
  return res.data.data!
}

/** 修改自己的那条评分/留言（一人一歌一条，重复评分即改这条） */
export async function updateShare(dto: UpdateShareDTO): Promise<MusicShareItem> {
  const res = await http.put<Envelope<MusicShareItem>>('/api/v1/music/share', dto)
  return res.data.data!
}

export interface ShareListResult {
  list: MusicShareItem[]
  total: number
  page: number
  limit: number
}

/** 分享动态：按分享时间倒序分页（分页字段平铺在信封外层，与公告 / 下载历史一致） */
export async function fetchShares(page = 1, limit = 20): Promise<ShareListResult> {
  const res = await http.get<Envelope<MusicShareItem[]>>('/api/v1/music/shares', {
    params: { page, limit },
  })
  const body = res.data as Envelope<MusicShareItem[]> & {
    total?: number
    page?: number
    limit?: number
  }
  return {
    list: body.data ?? [],
    total: body.total ?? 0,
    page: body.page ?? page,
    limit: body.limit ?? limit,
  }
}

/** 月度排行：month 形如 2026-09，不传则由后端取当前月 */
export async function fetchChart(month?: string): Promise<MusicChartItem[]> {
  const params: Record<string, string> = {}

  if (month) {
    params.month = month
  }

  const res = await http.get<Envelope<MusicChartItem[]>>('/api/v1/music/chart', { params })
  return res.data.data ?? []
}

/**
 * 单曲详情：评分分布 + 当月全部留言 + 我在这首歌上的评分记录。
 * month 只过滤 list/stats，mine 不受它影响 —— 判断「本月改」还是「往月已锁」要用后者。
 */
export async function fetchSongDetail(songmid: string, month?: string): Promise<MusicSongDetail> {
  const params: Record<string, string> = { songmid }

  if (month) {
    params.month = month
  }

  const res = await http.get<Envelope<MusicSongDetail>>('/api/v1/music/chart/detail', { params })
  return res.data.data!
}
