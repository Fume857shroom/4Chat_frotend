// ==========================================
// src/api/user/profile.ts
// 个人中心接口
// ==========================================
import http from '../http'
import type { UserProfile, UpdateProfileDTO, UpdateStatusDTO } from '../../types/user'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await http.get<ApiResponse<UserProfile>>('/api/v1/user/profile')
  return response.data.data
}

export async function updateProfile(dto: UpdateProfileDTO): Promise<void> {
  await http.put('/api/v1/user/profile', dto)
}

export async function updateStatus(dto: UpdateStatusDTO): Promise<void> {
  await http.put('/api/v1/user/status', dto)
}

// 4. 上传头像（前端不限制文件类型与大小，直接上传）
export async function uploadAvatar(file: Blob): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await http.post<ApiResponse<{ avatarUrl: string }>>(
    '/api/v1/user/avatar',
    formData,
  )
  return response.data.data
}
