import http from './http'

export interface SenderInfo {
  id: string
  username: string
}

export interface MessageItem {
  id: string
  content: string
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

interface HistoryResponse {
  code: number
  data: {
    items: MessageItem[]
    nextCursor: string | null
  }
}

export async function sendMessage(content: string): Promise<MessageItem> {
  const response = await http.post<MessageResponse>('/api/v1/messages', { content })
  return response.data.data
}

export async function fetchHistory(cursor?: string, limit = 20): Promise<HistoryResponse['data']> {
  const params: Record<string, string | number> = { limit }

  if (cursor) {
    params.cursor = cursor
  }

  const response = await http.get<HistoryResponse>('/api/v1/messages/history', { params })
  return response.data.data
}
