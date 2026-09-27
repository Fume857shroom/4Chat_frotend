import type { RouteRecordRaw } from 'vue-router'
// 刻意保持静态导入：/login 是未登录用户的首屏，也是 http.ts 收到 401 后
// 直接 window.location.href 跳转的落地页 —— 它本来就要立刻渲染，
// 拆成异步 chunk 只会给首屏多加一次阻塞请求。
import LoginView from '../../views/LoginView.vue'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      guestOnly: true,
      feature: 'auth',
    },
  },
]
