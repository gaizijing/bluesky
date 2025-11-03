
export function setupRouterGuard(router) {
  // 全局前置守卫
  router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = `${to.meta.title || '气象服务系统'} - ${import.meta.env.VITE_APP_TITLE}`
    
//     // 简单的权限控制示例（实际项目可扩展）
//     const isAuthenticated = !!localStorage.getItem('token') // 假设token存在表示已登录
//     if (to.path === '/login') {
//       next()
//     } else if (!isAuthenticated) {
//       // 未登录跳转登录页
//       ElMessage.warning('请先登录')
//       next('/login')
//     } else {
//       next()
//     }
    next()
   })

  // 全局后置守卫
  router.afterEach((to, from) => {
    // 页面切换后滚动到顶部
    window.scrollTo(0, 0)
  })

  // 路由错误处理
  router.onError((error) => {
    console.error('路由错误:', error)
    ElMessage.error('页面加载失败，请刷新重试')
  })
}