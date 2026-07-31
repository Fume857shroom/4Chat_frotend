import http from './http'

export interface LoginPayload {
  username: string
  password: string
}

export type RegisterPayload = LoginPayload

/** JWT 解析后的完整用户信息 (payload: { id, username }) */
export interface AuthUser {
  id: string
  username: string
}

/** 登录/注册响应中的用户信息（仅含 username） */
export interface AuthUserInfo {
  username: string
}

/** 登录/注册成功响应（扁平格式，非 ApiResponse 包裹） */
export interface AuthResult {
  token: string
  user: AuthUserInfo
}

interface AuthResponseBody {
  token: string
  user: AuthUserInfo
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await http.post<AuthResponseBody>('/api/auth/login', payload)
  return response.data
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const response = await http.post<AuthResponseBody>('/api/auth/register', payload)
  return response.data
}
