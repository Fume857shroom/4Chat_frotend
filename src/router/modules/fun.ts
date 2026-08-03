import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../../views/HomeView.vue'
import FunView from '../../views/fun/FunView.vue'
import CalendarView from '../../views/fun/CalendarView.vue'
import FunPagePlaceholder from '../../components/fun/FunPagePlaceholder.vue'

export const funRoutes: RouteRecordRaw[] = [
  {
    path: '/fun',
    component: HomeView,
    meta: {
      requiresAuth: true,
      feature: 'shell',
    },
    children: [
      {
        path: '',
        name: 'fun',
        component: FunView,
        meta: {
          requiresAuth: true,
          feature: 'fun',
        },
        children: [
          {
            path: 'calendar',
            name: 'fun-calendar',
            component: CalendarView,
            meta: {
              requiresAuth: true,
              feature: 'fun',
            },
          },
          {
            path: 'gomoku',
            name: 'fun-gomoku',
            component: FunPagePlaceholder,
            props: { icon: '⚫', name: '五子棋' },
            meta: {
              requiresAuth: true,
              feature: 'fun',
            },
          },
          {
            path: 'chess',
            name: 'fun-chess',
            component: FunPagePlaceholder,
            props: { icon: '♞', name: '象棋' },
            meta: {
              requiresAuth: true,
              feature: 'fun',
            },
          },
        ],
      },
    ],
  },
]
