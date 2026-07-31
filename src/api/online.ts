import http from './http'

export interface OnlineUser {
  id: string
  username: string
}

export interface OnlineListResponse {
  code: number
  data: OnlineUser[]
  total: number
}

export async function fetchOnlineUsers(): Promise<OnlineListResponse> {
  const response = await http.get<OnlineListResponse>('/api/user/online')
  return response.data
}

export async function sendHeartbeat(): Promise<void> {
  await http.post('/api/user/heartbeat')
}

export function sendDisconnect(): void {
  const url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/user/disconnect`
  const token = localStorage.getItem('token')

  if (token) {
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
      })
    } catch {
      // silently fail - page is closing
    }
  }
}
