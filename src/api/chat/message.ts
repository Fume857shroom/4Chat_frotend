import http from '../http'

// ==========================================
// 消息相关
// ==========================================

export interface SenderInfo {
  id: number
  username: string
  // 头像相对路径（/uploads/...），空字符串或缺失表示无头像
  avatar?: string
}

/** 文件消息挂载的文件信息（后端 files 表） */
export interface FileInfo {
  id: number
  name: string
  size: number
  extension: string
  url: string
  senderId: number
  createdAt: string
}

export interface MessageItem {
  id: string
  content: string
  type: 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM'
  createdAt: string
  sender: SenderInfo
  // 新增：type === 'FILE' 时携带文件信息
  file?: FileInfo
}

export interface MessageDisplay extends MessageItem {
  _state?: 'sending' | 'sent' | 'failed'
  _tempId?: string
}

interface MessageResponse {
  code: number
  message: string
  data: MessageItem
}

export async function sendMessage(content: string): Promise<MessageItem> {
  const response = await http.post<MessageResponse>('/api/v1/messages', { content })
  return response.data.data
}

/** 媒体库文件条目（新文档：仅 senderId，不含 sender 对象） */
export interface MediaFile {
  id: number
  senderId: number
  name: string
  size: number
  extension: string
  url: string
  createdAt: string
}

export interface MediaListResult {
  data: MediaFile[]
  total: number
  page: number
  limit: number
}

// 发送文件消息：multipart 表单，file 字段 + 可选 content 描述
// 文件由后端 multer 处理，前端不手动设置 Content-Type（axios 自动带 boundary）
export async function sendFileMessage(file: File, content?: string): Promise<MessageItem> {
  const formData = new FormData()
  formData.append('file', file)
  if (content) {
    formData.append('content', content)
  }
  const response = await http.post<MessageResponse>('/api/v1/messages/file', formData)
  return response.data.data
}

// 媒体库：按扩展名筛选 + 分页，按时间倒序
// 分页字段（total/page/limit）平铺在信封外层
// 过滤 NULL 条件：files 表本身即文件全集，无需要前端过滤
async function fetchFilesInternal(params: {
  extension?: string
  page?: number
  limit?: number
} = {}): Promise<MediaListResult> {
  const response = await http.get<Record<string, unknown>>('/api/v1/messages/files', { params })
  const body = response.data
  return {
    data: (body.data as MediaFile[]) ?? [],
    total: (body.total as number) ?? 0,
    page: (body.page as number) ?? 1,
    limit: (body.limit as number) ?? 20,
  }
}

export const fetchFiles = fetchFilesInternal

export async function fetchHistory(cursor?: string, limit = 100): Promise<{
  messages: MessageItem[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const params: Record<string, string | number> = { limit }

  if (cursor) {
    params.cursor = cursor
  }

  const response = await http.get<Record<string, unknown>>('/api/v1/messages/history', { params })
  const body = response.data

  // Defensive: handle both spec formats
  // Spec: { code, data: Message[], nextCursor, hasMore }
  // Old:  { code, data: { items: Message[], nextCursor, hasMore } }
  const rawData = body.data as unknown
  const messagesArray = Array.isArray(rawData)
    ? (rawData as MessageItem[])
    : (rawData as Record<string, unknown>)?.items as MessageItem[] ?? []

  return {
    messages: messagesArray,
    nextCursor: (body.nextCursor as string | null) ?? (rawData as Record<string, unknown>)?.nextCursor as string | null ?? null,
    hasMore: (body.hasMore as boolean) ?? (rawData as Record<string, unknown>)?.hasMore as boolean ?? false,
  }
}

// ==========================================
// 公告相关
// ==========================================

export interface Announce {
  id: number
  userId: number
  title: string
  content: string
  status: number
  createdAt: string
}

export interface AnnounceListResult {
  data: Announce[]
  total: number
  page: number
  limit: number
}

export interface CreateAnnounceDTO {
  title: string
  content: string
}

export async function fetchAnnounces(page = 1, limit = 20): Promise<AnnounceListResult> {
  const response = await http.get<{
    code: number
    data: Announce[]
    total: number
    page: number
    limit: number
  }>('/api/v1/announce', { params: { page, limit } })
  return response.data as unknown as AnnounceListResult
}

export async function createAnnounce(dto: CreateAnnounceDTO): Promise<Announce> {
  const response = await http.post<{ code: number; message: string; data: Announce }>(
    '/api/v1/announce',
    dto,
  )
  return response.data.data
}