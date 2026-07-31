import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthUser } from '../api/auth'
import type { LoginPayload, RegisterPayload } from '../api/auth'
import { login, register } from '../api/auth'

const TOKEN_KEY = 'token'
const USER_KEY = 'auth_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(readUser())
  const isAuthenticated = computed(() => Boolean(token.value))

  async function loginAction(payload: LoginPayload) {
    const result = await login(payload)
    const decoded = parseJwtPayload(result.token)
    const resolvedUser: AuthUser = {
      id: decoded?.id || '',
      username: result.user.username,
    }
    persistAuth(result.token, resolvedUser)
  }

  async function registerAction(payload: RegisterPayload) {
    const result = await register(payload)
    const decoded = parseJwtPayload(result.token)
    const resolvedUser: AuthUser = {
      id: decoded?.id || '',
      username: result.user.username,
    }
    persistAuth(result.token, resolvedUser)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function persistAuth(nextToken: string, nextUser: AuthUser | null) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem(TOKEN_KEY, nextToken)

    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    loginAction,
    registerAction,
    logout,
  }
})

/** Decode JWT payload to extract user id and username */
function parseJwtPayload(token: string): { id: string; username: string } | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function readUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}
