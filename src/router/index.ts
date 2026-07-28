import { createRouter, createWebHistory } from 'vue-router'
import { authRoutes } from './modules/auth'
import { chatRoutes } from './modules/chat'

const routes = [...authRoutes, ...chatRoutes]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('auth_token')

  if (to.meta.requiresAuth && !token) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && token) {
    return { name: 'chat' }
  }

  return true
})

export default router
