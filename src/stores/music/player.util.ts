// ==========================================
// src/stores/music/player.util.ts
// 播放器 store 的纯件：类型、常量、localStorage 读写与队列序号运算。
// 独立成文件是因为 player.ts 的主体是音频编排，这些函数全都无状态、
// 可单独推理，混在一起会让 store 的必读部分涨到千行。
// ==========================================
import type { PlayableTrack } from '../../types/music'

/** 循环模式：off 顺序播完停住 / all 列表循环 / one 单曲循环 */
export type PlayMode = 'off' | 'all' | 'one'
/** 队列是从哪儿攒起来的，只用于展示来源文案 */
export type QueueSourceKind = '' | 'shares' | 'chart' | 'favorites' | 'playlist'

export interface Point {
  x: number
  y: number
}

export interface PersistedQueue {
  queue?: unknown
  queueIndex?: unknown
  source?: unknown
  sourceName?: unknown
  repeat?: unknown
  shuffle?: unknown
}

export interface PersistedMini {
  x?: unknown
  y?: unknown
  expanded?: unknown
  dismissed?: unknown
  volume?: unknown
}

export const QUEUE_KEY = 'music_player_queue'
export const MINI_KEY = 'music_player_mini'
/** 连续几首都取不到地址就停下：不挡的话上游抽风时会把整个队列的请求刷完 */
export const FAIL_LIMIT = 3
/** 已播超过这个秒数再点「上一首」＝重新起播当前这首，而不是退回上一首 */
export const PREV_RESTART_AT = 3
/** 循环按钮的切换顺序，与文案 列表循环 → 单曲循环 → 顺序播放 一致 */
export const REPEAT_ORDER: PlayMode[] = ['all', 'one', 'off']

/** 循环按钮的文案与角标，小播放器与右栏面板共用一份 */
export const REPEAT_LABEL: Record<PlayMode, string> = {
  all: '列表循环',
  one: '单曲循环',
  off: '顺序播放',
}
export const REPEAT_ICON: Record<PlayMode, string> = {
  all: '🔁',
  one: '🔂',
  off: '▶',
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1
  }

  return Math.min(Math.max(index, 0), length - 1)
}

export function isTrack(value: unknown): value is PlayableTrack {
  const item = value as PlayableTrack | null
  return !!item && typeof item.songmid === 'string' && typeof item.title === 'string'
}

/** Fisher-Yates 洗牌出来的下标序列：整队列各播一次，天然不会连续重复同一首 */
export function makeShuffleOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = order[i]!
    order[i] = order[j]!
    order[j] = swap
  }

  return order
}

/** 存储读取只在恢复这一处容错：用户手改 localStorage 是边界，坏了就当没存过 */
export function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 无痕模式下 setItem 会抛：存不上就算了，不该影响播放
  }
}

/** 未知结构 → 曲目数组。字段逐个验，缺 artist 补空串而不是让模板显示 undefined */
export function toTracks(value: unknown): PlayableTrack[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isTrack).map((item) => ({
    songmid: item.songmid,
    title: item.title,
    artist: typeof item.artist === 'string' ? item.artist : '',
    duration: Number(item.duration) || 0,
    coverUrl: typeof item.coverUrl === 'string' ? item.coverUrl : '',
  }))
}

export function pickSource(value: unknown): QueueSourceKind {
  return value === 'shares' || value === 'chart' || value === 'favorites' || value === 'playlist'
    ? value
    : ''
}

export function pickMode(value: unknown): PlayMode {
  return value === 'off' || value === 'one' ? value : 'all'
}

export function readPoint(saved: PersistedMini | null): Point | null {
  const x = Number(saved?.x)
  const y = Number(saved?.y)

  // 任一格缺失或不是数字都退回默认右下角（组件里会再按视口 clamp 一次）
  if (saved?.x == null || saved?.y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return { x, y }
}
