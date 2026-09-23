import http from '../http'
import type { Envelope } from '../http'

// 禁漫下载（jmcomic）BFF 接口封装
// 后端：4Chat_backend(:3000) 反代内网 jmcomic-api(:8000)，前端只与 /api/v1/jmcomic/* 通信
// download/history 为 camelCase；task 为 Python 原样透传的 snake_case

export type JmStatus = 'queued' | 'downloading' | 'done' | 'failed'

export interface JmProgress {
  photo_done: number
  photo_total: number
  image_done: number
  image_total: number
}

/** GET /task/:id 的 data（snake_case，Python 透传） */
export interface JmTask {
  task_id: string
  album_id: string
  status: JmStatus
  error: string | null
  progress: JmProgress
  album: Record<string, unknown> | null
  /** 排队位置(1-based)，仅 status='queued' 时非 null */
  queue_position: number | null
  /** 服务器正在下载的本数(<= MAX_CONCURRENT=3) */
  running_count: number
  /** 服务器等待队列长度 */
  queue_length: number
}

/** POST /download 的 data（camelCase） */
export interface JmSubmitResult {
  taskId: string
  status: JmStatus
  albumId: string
  title: string | null
}

/** POST /download/batch 的 data（camelCase） */
export interface JmBatchResult {
  tasks: { albumId: string; taskId: string }[]
  count: number
}

/**
 * 下载历史状态（DB 落库值，与 task.status 词汇不同）：
 * 提交时写 'pending'，任务终态回写 'done'/'failed'（不含 'queued'/'downloading'）
 */
export type JmHistoryStatus = 'pending' | 'done' | 'failed'

/** GET /history 单项（camelCase） */
export interface JmHistoryItem {
  id: number
  albumId: string
  title: string | null
  taskId: string | null
  status: JmHistoryStatus
  createdAt: string
}

export interface JmAlbumDetail {
  id: string
  title: string
  description?: string
  authors?: string[]
  tags?: string[]
  page_count?: number
  chapters?: { photo_id: string; title: string; index: number }[]
  [k: string]: unknown
}

/** 提交下载任务 */
export async function submitDownload(albumId: string): Promise<JmSubmitResult> {
  const res = await http.post<Envelope<JmSubmitResult>>('/api/v1/jmcomic/download', { albumId })
  return res.data.data!
}

/** 批量提交下载任务（一次性排队多本，单次最多 100 本；并发/排队由后端 MAX_CONCURRENT=3 调度） */
export async function submitDownloadBatch(albumIds: string[]): Promise<JmBatchResult> {
  const res = await http.post<Envelope<JmBatchResult>>('/api/v1/jmcomic/download/batch', {
    albumIds,
  })
  return res.data.data!
}

/** 查询任务进度 */
export async function getTask(taskId: string): Promise<JmTask> {
  const res = await http.get<Envelope<JmTask>>(
    `/api/v1/jmcomic/task/${encodeURIComponent(taskId)}`,
  )
  return res.data.data!
}

/** 本子详情（可选，用于展示标题/章节） */
export async function getAlbum(albumId: string): Promise<JmAlbumDetail> {
  const res = await http.get<Envelope<JmAlbumDetail>>(
    `/api/v1/jmcomic/album/${encodeURIComponent(albumId)}`,
  )
  return res.data.data!
}

/** 我的下载历史：分页字段（total/page/limit）平铺在信封外层 */
export async function getHistory(
  page = 1,
  limit = 20,
): Promise<{ list: JmHistoryItem[]; total: number }> {
  const res = await http.get<Envelope<JmHistoryItem[]>>('/api/v1/jmcomic/history', {
    params: { page, limit },
  })
  const total = (res.data as { total?: number }).total ?? 0
  return { list: res.data.data ?? [], total }
}

/**
 * 下载整本 ZIP：responseType blob → 触发浏览器下载。
 * 未就绪时后端返回 409（JSON），但 blob 模式下 error.response.data 是 Blob，
 * 拦截器取不到 message，这里读成文本再解析。
 */
export async function downloadZip(albumId: string): Promise<void> {
  try {
    const res = await http.get(`/api/v1/jmcomic/zip/${encodeURIComponent(albumId)}`, {
      responseType: 'blob',
      // ZIP 体积可能很大，慢速链路下会超过全局 10s 超时；下载请求单独关闭超时限制
      timeout: 0,
    })
    triggerBlobDownload(res.data as Blob, `${albumId}.zip`)
  } catch (err) {
    throw new Error(await extractBlobErrorMessage(err))
  }
}

/**
 * 浏览器原生直下（当前 ZIP 下载主用方式）：返回带 ?token= 的直链，交给 window.location/<a> 触发。
 * 不走 axios，因此无全局 10s 超时；进度/续传由浏览器下载管理器负责，大文件直接落盘不占内存。
 */
export function zipDirectUrl(albumId: string): string {
  const token = localStorage.getItem('token') ?? ''
  const baseURL = import.meta.env.VITE_API_BASE_URL || ''
  return `${baseURL}/api/v1/jmcomic/zip/${encodeURIComponent(albumId)}?token=${encodeURIComponent(token)}`
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 从 axios 错误里解析后端 message：blob 响应需先 text() 再 JSON.parse
async function extractBlobErrorMessage(err: unknown): Promise<string> {
  const axiosErr = err as { response?: { data?: unknown }; message?: string }
  const data = axiosErr.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string }
      if (parsed.message) return parsed.message
    } catch {
      // 忽略无法解析的 blob
    }
  }
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message: unknown }).message)
  }
  return axiosErr.message || 'ZIP 下载失败'
}
