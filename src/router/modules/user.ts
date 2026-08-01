// ==========================================
// src/router/modules/user.ts
// 个人中心路由（挂在 app-shell 下，与 chat 结构一致）
// ==========================================
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../../views/HomeView.vue'
import ProfileView from '../../views/user/ProfileView.vue'

export const userRoutes: RouteRecordRaw[] = [
  {
    path: '/profile',
    component: HomeView,
    meta: {
      requiresAuth: true,
      feature: 'shell',
    },
    children: [
      {
        path: '',
        name: 'profile',
        component: ProfileView,
        meta: {
          requiresAuth: true,
          feature: 'user',
        },
      },
    ],
  },
]
