// ==========================================
// src/router/modules/music.ts
// 「歌」板块路由（挂在 app-shell 下，与 fun / jm 结构一致）
// 注册方式（由人工接线，本文件不改 index.ts）：
//   import { musicRoutes } from './modules/music'
//   const routes = [...authRoutes, ...chatRoutes, ...userRoutes, ...funRoutes, ...jmRoutes, ...musicRoutes]
// 侧边栏入口：在 AppSidebar 的 nav 中加 <RouterLink to="/music" title="歌">
// ==========================================
import type { RouteRecordRaw } from 'vue-router'
// 静态导入（刻意不拆包）：HomeView 是 app-shell，每次导航都要立刻用。
// 「歌」的四个页面按需加载：播放器与歌单 store 已被 MiniPlayer 拉进首屏 chunk，
// 这里拆的是视图本身（分享动态/榜单/收藏/搜索面板），不进首屏。
import HomeView from '../../views/HomeView.vue'

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
        component: () => import('../../views/music/MusicView.vue'),
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
            component: () => import('../../views/music/MusicPlayView.vue'),
            meta: {
              requiresAuth: true,
              feature: 'music',
            },
          },
          {
            path: 'rank',
            name: 'music-rank',
            component: () => import('../../views/music/MusicRankView.vue'),
            meta: {
              requiresAuth: true,
              feature: 'music',
            },
          },
          {
            path: 'favorites',
            name: 'music-favorites',
            component: () => import('../../views/music/MusicFavoritesView.vue'),
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
