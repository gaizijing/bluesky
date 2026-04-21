export const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login/index.vue'),
    meta: {
      title: '登录',
      hidden: true
    }
  },
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
          }
        ]
      }
    ]
  },{
    path: '/vuemap',
    name: 'Map',
    component: () => import('@/components/map/VueMap.vue'),
    meta: {
      title: '地图',
      icon: 'map'
    }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/layout/AdminLayout.vue'),
    redirect: '/admin/threshold',
    meta: {
      title: '后台管理',
      icon: 'admin',
      hidden: false
    },
    children: [
      {
        path: '/admin/threshold',
        name: 'AdminThresholdManagement',
        component: () => import('@/pages/Admin/ThresholdManagement.vue'),
        meta: {
          title: '阈值管理'
        }
      },
      {
        path: '/admin/user',
        name: 'UserManagement',
        component: () => import('@/pages/Admin/UserManagement.vue'),
        meta: {
          title: '用户管理'
        }
      },
      {
        path: '/admin/aircraft',
        name: 'AircraftManagement',
        component: () => import('@/pages/Admin/AircraftManagement.vue'),
        meta: {
          title: '飞行器管理'
        }
      },
      {
        path: '/admin/monitoring-point',
        name: 'MonitoringPointManagement',
        component: () => import('@/pages/Admin/MonitoringPointManagement.vue'),
        meta: {
          title: '监测点管理'
        }
      },
      {
        path: '/admin/device',
        name: 'DeviceManagement',
        component: () => import('@/pages/Admin/DeviceManagement.vue'),
        meta: {
          title: '设备管理'
        }
      },
      {
        path: '/admin/camera',
        name: 'CameraManagement',
        component: () => import('@/pages/Admin/CameraManagement.vue'),
        meta: {
          title: '摄像头管理'
        }
      },
      {
        path: '/admin/region-config',
        name: 'RegionConfigManagement',
        component: () => import('@/pages/Admin/RegionConfigManagement.vue'),
        meta: {
          title: '地区配置管理'
        }
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
