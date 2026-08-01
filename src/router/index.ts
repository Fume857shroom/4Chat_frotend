import { createRouter, createWebHistory } from 'vue-router'
import { authRoutes } from './modules/auth'
import { chatRoutes } from './modules/chat'
import { userRoutes } from './modules/user'

const routes = [...authRoutes, ...chatRoutes, ...userRoutes]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && token) {
    return { name: 'chat' }
  }

  return true
})

export default router
