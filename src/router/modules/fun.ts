import type { RouteRecordRaw } from 'vue-router'
// 静态导入（刻意不拆包）：
// - HomeView 是 app-shell，每次导航都要立刻用；
// - FunPagePlaceholder 只是一个几百字节的占位组件，且 fun / jm 两个模块共用，
//   单独拆一个 chunk 反而多一次请求。
import HomeView from '../../views/HomeView.vue'
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
        // 「乐」整块按需加载：不进聊天首屏
        component: () => import('../../views/fun/FunView.vue'),
        meta: {
          requiresAuth: true,
          feature: 'fun',
        },
        children: [
          {
            path: 'calendar',
            name: 'fun-calendar',
            // 单独一个 chunk 收益最大：CalendarView 经 CalendarMonth / HuangliPanel
            // 拉进 lunar-javascript（体积远大于自研代码），只有点进黄历才需要
            component: () => import('../../views/fun/CalendarView.vue'),
            meta: {
              requiresAuth: true,
              feature: 'fun',
            },
          },
          {
            path: 'gomoku',
            name: 'fun-gomoku',
            component: () => import('../../views/fun/GomokuView.vue'),
            meta: {
              requiresAuth: true,
              feature: 'fun',
            },
          },
          {
            path: 'tarot',
            name: 'fun-tarot',
            // 塔罗整块单独一个 chunk：牌面图与 15 套布局坐标只有点进来才需要，
            // 不能拖累「乐」的其它子页面
            component: () => import('../../views/fun/TarotView.vue'),
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
