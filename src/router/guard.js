
import { ElMessage } from 'element-plus'
import { canAccessSettingFromStorage } from '@/utils/roleUtils'

const ROUTE_RELOAD_FLAG = '__admin_route_reload__'
const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Loading chunk [\d]+ failed/i,
  /ChunkLoadError/i
]

const isDynamicImportError = (error) => {
  const message = [error?.message, error?.stack].filter(Boolean).join('\n')
  return DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function setupRouterGuard(router) {
  // 全局前置守卫
  router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = `${to.meta.title || '气象服务系统'} - ${import.meta.env.VITE_APP_TITLE}`
    
    // 简单的权限控制示例（实际项目可扩展）
    const isAuthenticated = !!localStorage.getItem('token')
    const canManageSettings = canAccessSettingFromStorage()
    
    if (to.path === '/login' || to.path.startsWith('/demos')) {
      next()
    } else if (!isAuthenticated) {
      ElMessage.warning('请先登录')
      next('/login')
    } else if (to.path === '/' || to.path === '') {
      next('/dashboard')
    } else if (to.path.startsWith('/setting') && !canManageSettings) {
      ElMessage.warning('权限不足，无法访问系统设置页面')
      next('/dashboard')
    } else {
      next()
    }
   })

  // 全局后置守卫
  router.afterEach((to) => {
    window.scrollTo(0, 0)
    if (sessionStorage.getItem(ROUTE_RELOAD_FLAG) === to.fullPath) {
      sessionStorage.removeItem(ROUTE_RELOAD_FLAG)
    }
  })

  // 路由错误处理：动态 import 失败时整页刷新（仅重试一次，避免相同 hash 不触发 reload）
  router.onError((error, to) => {
    console.error('路由错误:', error)

    if (isDynamicImportError(error)) {
      const targetPath = to?.fullPath || '/'
      const reloadedPath = sessionStorage.getItem(ROUTE_RELOAD_FLAG)

      if (reloadedPath !== targetPath) {
        sessionStorage.setItem(ROUTE_RELOAD_FLAG, targetPath)
        window.location.reload()
        return
      }

      sessionStorage.removeItem(ROUTE_RELOAD_FLAG)
    }

    ElMessage.error('页面加载失败，请重启开发服务后刷新页面')
  })
}
