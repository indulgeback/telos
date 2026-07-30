import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from './lib/api'

const routes = [
  { path: '/login', name: 'login', component: () => import('./pages/Login.vue') },
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('./pages/Dashboard.vue'), meta: { title: '工作台' } },
  { path: '/agents', name: 'agents', component: () => import('./pages/Agents.vue'), meta: { title: 'Agent 管理' } },
  { path: '/skills', name: 'skills', component: () => import('./pages/Skills.vue'), meta: { title: 'Skill 商店' } },
  { path: '/models', name: 'models', component: () => import('./pages/Models.vue'), meta: { title: '模型管理' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 鉴权守卫: 无 token 跳登录
router.beforeEach((to, _from, next) => {
  const token = getToken()
  if (to.name !== 'login' && !token) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && token) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
