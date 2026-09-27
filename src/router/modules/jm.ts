// ==========================================
// src/router/modules/jm.ts
// 禁漫功能区路由（挂在 app-shell 下，与 fun 结构一致）
// ==========================================
import type { RouteRecordRaw } from 'vue-router'
// 静态导入（刻意不拆包）：HomeView 是 app-shell；FunPagePlaceholder 是共用的小占位组件
import HomeView from '../../views/HomeView.vue'
import FunPagePlaceholder from '../../components/fun/FunPagePlaceholder.vue'

export const jmRoutes: RouteRecordRaw[] = [
  {
    path: '/jm',
    component: HomeView,
    meta: {
      requiresAuth: true,
      feature: 'shell',
    },
    children: [
      {
        path: '',
        name: 'jm',
        // 「禁」整块按需加载：与聊天首屏无关
        component: () => import('../../views/jm/JmView.vue'),
        meta: {
          requiresAuth: true,
          feature: 'jm',
        },
        children: [
          {
            path: 'download',
            name: 'jm-download',
            component: () => import('../../views/jm/JmDownloadView.vue'),
            meta: {
              requiresAuth: true,
              feature: 'jm',
            },
          },
          {
            path: 'official',
            name: 'jm-official',
            component: FunPagePlaceholder,
            props: { icon: '🈲', name: '禁漫官方' },
            meta: {
              requiresAuth: true,
              feature: 'jm',
            },
          },
        ],
      },
    ],
  },
]
