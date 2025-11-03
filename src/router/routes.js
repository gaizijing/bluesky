export const routes = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { hidden: true }, 
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/Dashboard/index.vue'),
        meta: {
          title: '气象大屏',
          icon: 'dashboard'
        }
      },
      {
        path: '/setting',
        name: 'Setting',
        component: () => import('@/pages/Setting/index.vue'),
        meta: {
          title: '系统设置',
          icon: 'setting'
        }
      }
    ]
  },
//   {
//     path: '/error',
//     name: 'Error',
//     component: () => import('@/pages/Error/index.vue'),
//     meta: {
//       title: '错误页面',
//       hidden: true
//     }
//   },
//   {
//     path: '/:pathMatch(.*)*',
//     redirect: '/error',
//     meta: {
//       hidden: true
//     }
//   }
]