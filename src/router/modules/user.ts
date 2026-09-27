// ==========================================
// src/router/modules/user.ts
// 个人中心路由（挂在 app-shell 下，与 chat 结构一致）
// ==========================================
import type { RouteRecordRaw } from 'vue-router'
// 静态导入（刻意不拆包）：HomeView 是 app-shell，每个页面都套它
import HomeView from '../../views/HomeView.vue'

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
        // 按需加载：个人中心经 AvatarCropper 拉进 cropperjs，只有点头像编辑才用得到
        component: () => import('../../views/user/ProfileView.vue'),
        meta: {
          requiresAuth: true,
          feature: 'user',
        },
      },
    ],
  },
]
