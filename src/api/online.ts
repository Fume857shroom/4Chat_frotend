import http from './http'

export interface OnlineUser {
  id: string
  username: string
}

export interface OnlineListResponse {
  users: OnlineUser[]
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
  const token = localStorage.getItem('auth_token')

  if (token) {
    navigator.sendBeacon(
      url,
      JSON.stringify({ token }),
    )
  }
}
