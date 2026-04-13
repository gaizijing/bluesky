
import { ElMessage } from 'element-plus'

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
    const isAuthenticated = !!localStorage.getItem('token') // 假设token存在表示已登录
    const userRole = localStorage.getItem('userRole') || 'user' // 假设用户角色存储在localStorage中
    
    if (to.path === '/login') {
      next()
    } else if (!isAuthenticated) {
      // 未登录跳转登录页
      ElMessage.warning('请先登录')
      next('/login')
    } else if (to.path === '/' || to.path === '') {
      // 已登录且访问根路径，根据角色跳转到不同首页
      if (userRole === 'admin') {
        next('/admin')
      } else {
        next('/dashboard')
      }
    } else if (to.path.startsWith('/admin') && userRole !== 'admin') {
      // 非管理员访问后台管理页面
      ElMessage.warning('权限不足，无法访问后台管理页面')
      next('/dashboard')
    } else {
      next()
    }
   })

  // 全局后置守卫
  router.afterEach((to, from) => {
    // 页面切换后滚动到顶部
    window.scrollTo(0, 0)
    sessionStorage.removeItem(ROUTE_RELOAD_FLAG)
  })

  // 路由错误处理
  router.onError((error, to) => {
    console.error('路由错误:', error)

    if (isDynamicImportError(error)) {
      const targetPath = to?.fullPath || window.location.hash || '/'
      const reloadedPath = sessionStorage.getItem(ROUTE_RELOAD_FLAG)

      if (reloadedPath !== targetPath) {
        sessionStorage.setItem(ROUTE_RELOAD_FLAG, targetPath)
        window.location.assign(targetPath.startsWith('#') ? targetPath : `#${targetPath}`)
        return
      }
    }

    ElMessage.error('页面加载失败，请刷新重试')
  })
}
