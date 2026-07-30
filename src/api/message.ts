import http from './http'

export interface SenderInfo {
  id: string
  username: string
}

export interface MessageItem {
  id: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'SYSTEM'
  createdAt: string
  sender: SenderInfo
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
