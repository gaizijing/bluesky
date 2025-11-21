export const routes = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { hidden: false }, 
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
        redirect: '/setting/threshold',
        meta: {
          title: '系统设置',
          icon: 'setting'
        },
        children: [
          {
            path: '/setting/threshold',
            name: 'ThresholdManagement',
            component: () => import('@/pages/Setting/views/ThresholdManagement.vue'),
            meta: {
              title: '阈值管理'
            }
          },
          {
            path: '/setting/monitoring-points',
            name: 'MonitoringPointsManagement',
            component: () => import('@/pages/Setting/views/MonitoringPointsManagement.vue'),
            meta: {
              title: '监测点管理'
            }
          }
        ]
      }
    ]
  }
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