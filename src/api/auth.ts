import http from './http'

export interface LoginPayload {
  username: string
  password: string
}

export type RegisterPayload = LoginPayload

export interface AuthUser {
  username: string
  email?: string
}

export interface AuthResult {
  token: string
  user: AuthUser | null
}

interface ApiResponseShape {
  token?: string
  accessToken?: string
  user?: AuthUser
  data?: {
    token?: string
    accessToken?: string
    user?: AuthUser
  }
}

function normalizeAuthResult(payload: ApiResponseShape): AuthResult {
  const token =
    payload.token ||
    payload.accessToken ||
    payload.data?.token ||
    payload.data?.accessToken ||
    ''

  if (!token) {
    throw new Error('接口返回成功，但未提供可用的 token 字段。')
  }

  return {
    token,
    user: payload.user || payload.data?.user || null,
  }
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await http.post<ApiResponseShape>('/api/auth/login', payload)

  return normalizeAuthResult(response.data)
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const response = await http.post<ApiResponseShape>('/api/auth/register', payload)

  return normalizeAuthResult(response.data)
}
