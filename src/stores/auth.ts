import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthUser, LoginPayload, RegisterPayload } from '../api/auth'
import { login, register } from '../api/auth'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(readUser())
  const isAuthenticated = computed(() => Boolean(token.value))

  async function loginAction(payload: LoginPayload) {
    const result = await login(payload)
    persistAuth(result.token, result.user)
  }

  async function registerAction(payload: RegisterPayload) {
    const result = await register(payload)
    persistAuth(result.token, result.user)
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
