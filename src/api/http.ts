import axios from 'axios'

// 后端统一响应信封：{ code, message, data }，code === 0 为成功
// 分页等附加字段（nextCursor/hasMore/total/page/limit）平铺在信封外层
export interface Envelope<T> {
  code: number
  message: string
  data?: T
}

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

const http = axios.create({
  baseURL,
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

http.interceptors.response.use(
  (response) => {
    // HTTP 2xx 但业务失败（兜底，正常情况下业务错误走 HTTP 4xx/5xx）
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return response
  },
  (error) => {
    // 业务错误信息透出（如 429 限流提示），供调用方展示
    const serverMessage = error.response?.data?.message
    if (serverMessage) {
      error.message = serverMessage
    }

    if (error.response?.status === 401) {
      // Clear both new and old storage keys for migration safety
      localStorage.removeItem('token')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default http
