import http from './http'
import type { Envelope } from './http'

export interface LoginPayload {
  username: string
  password: string
}

export type RegisterPayload = LoginPayload

/** 用户 id 统一为数字（后端已修复：此前部分接口返回字符串） */
export interface AuthUser {
  id: number
  username: string
}

/** 登录/注册响应中的用户信息（id 为数字，后端新增字段） */
export interface AuthUserInfo {
  id: number
  username: string
}

/** 登录/注册成功响应 */
export interface AuthResult {
  token: string
  user: AuthUserInfo
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await http.post<Envelope<AuthResult>>('/api/v1/auth/login', payload)
  return response.data.data!
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const response = await http.post<Envelope<AuthResult>>('/api/v1/auth/register', payload)
  return response.data.data!
}
