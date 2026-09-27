import type { RouteRecordRaw } from 'vue-router'
// 刻意保持静态导入的两个：
// - HomeView 是 app-shell（chat / fun / jm / music / profile 五条路由都套它），
//   任何一次已登录导航都要立刻用，拆包只是多一次请求；
// - ChatView 是 `/` 的默认落点（'' → redirect '/chat'），登录后首屏就是它，
//   同理不拆。真正该按需加载的是下面点进去才用的二级页。
import HomeView from '../../views/HomeView.vue'
import ChatView from '../../views/chat/ChatView.vue'

export const chatRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: HomeView,
    meta: {
      requiresAuth: true,
      feature: 'shell',
    },
    children: [
      {
        path: '',
        redirect: '/chat',
      },
      {
        path: 'chat',
        name: 'chat',
        component: ChatView,
        meta: {
          requiresAuth: true,
          feature: 'chat',
        },
      },
      {
        path: 'chat/files',
        name: 'files',
        // 页面级组件按需加载：文件库是从聊天页点进去的二级页，不进首屏
        component: () => import('../../views/chat/FileGalleryView.vue'),
        meta: {
          requiresAuth: true,
          feature: 'chat',
        },
      },
    ],
  },
]
