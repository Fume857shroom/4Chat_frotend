// ==========================================
// src/router/modules/music.ts
// 「歌」板块路由（挂在 app-shell 下，与 fun / jm 结构一致）
// 注册方式（由人工接线，本文件不改 index.ts）：
//   import { musicRoutes } from './modules/music'
//   const routes = [...authRoutes, ...chatRoutes, ...userRoutes, ...funRoutes, ...jmRoutes, ...musicRoutes]
// 侧边栏入口：在 AppSidebar 的 nav 中加 <RouterLink to="/music" title="歌">
// ==========================================
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../../views/HomeView.vue'
import MusicView from '../../views/music/MusicView.vue'
import MusicPlayView from '../../views/music/MusicPlayView.vue'
import MusicRankView from '../../views/music/MusicRankView.vue'

export const musicRoutes: RouteRecordRaw[] = [
  {
    path: '/music',
    component: HomeView,
    meta: {
      requiresAuth: true,
      feature: 'shell',
    },
    children: [
      {
        path: '',
        name: 'music',
        component: MusicView,
        meta: {
          requiresAuth: true,
          feature: 'music',
        },
        children: [
          // 默认子路由：直访 /music 也有内容，不停留在空壳
          {
            path: '',
            redirect: { name: 'music-play' },
          },
          {
            path: 'play',
            name: 'music-play',
            component: MusicPlayView,
            meta: {
              requiresAuth: true,
              feature: 'music',
            },
          },
          {
            path: 'rank',
            name: 'music-rank',
            component: MusicRankView,
            meta: {
              requiresAuth: true,
              feature: 'music',
            },
          },
        ],
      },
    ],
  },
]
