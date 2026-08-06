import http from '../http'

export interface OnlineUser {
  id: number
  username: string
  // 头像相对路径（/uploads/...），空字符串或缺失表示无头像
  avatar?: string
  // 心情状态（个人中心设置），可能为空字符串或缺失
  status?: string
}

export interface OnlineListResponse {
  code: number
  data: OnlineUser[]
  total: number
}

export async function fetchOnlineUsers(): Promise<OnlineListResponse> {
  const response = await http.get<OnlineListResponse>('/api/v1/user/online')
  return response.data
}

export async function sendHeartbeat(): Promise<void> {
  await http.post('/api/v1/user/heartbeat')
}

export function sendDisconnect(): void {
  const url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/user/disconnect`
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