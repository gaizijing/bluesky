import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { setupRouterGuard } from './guard'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

// 重置路由
export const resetRouter = () => {
  const newRouter = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior: () => ({ left: 0, top: 0 })
  })
  router.matcher = newRouter.matcher
}

// 配置路由守卫
setupRouterGuard(router)

export default router