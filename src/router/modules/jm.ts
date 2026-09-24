// ==========================================
// src/router/modules/jm.ts
// 禁漫功能区路由（挂在 app-shell 下，与 fun 结构一致）
// ==========================================
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../../views/HomeView.vue'
import JmView from '../../views/jm/JmView.vue'
import JmDownloadView from '../../views/jm/JmDownloadView.vue'
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
        component: JmView,
        meta: {
          requiresAuth: true,
          feature: 'jm',
        },
        children: [
          {
            path: 'download',
            name: 'jm-download',
            component: JmDownloadView,
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
