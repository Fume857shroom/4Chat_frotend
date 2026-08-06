// ==========================================
// src/types/user.ts
// 个人中心类型定义
// ==========================================

export interface UserProfile {
  id: number
  username: string          // 登录账号（只读，不可修改）
  nickname: string          // 昵称
  avatar: string            // 头像 URL
  birthday: string | null   // ISO 日期格式 YYYY-MM-DD
  gender: string            // 性别（自定义）
  city: string              // 当前城市
  status: string            // 状态心情
  sentMessageCount: number  // 已发送消息总数（只读）
  activeHours: number       // 活跃时间（小时，只读）
}

export interface UpdateProfileDTO {
  nickname?: string
  birthday?: string | null
  gender?: string
  city?: string
}

export interface UpdateStatusDTO {
  status: string
}
