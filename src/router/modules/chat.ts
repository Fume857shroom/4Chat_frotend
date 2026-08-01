import type { RouteRecordRaw } from 'vue-router'
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
    ],
  },
]
