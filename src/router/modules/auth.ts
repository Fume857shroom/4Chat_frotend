import type { RouteRecordRaw } from 'vue-router'
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
