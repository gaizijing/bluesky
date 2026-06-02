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
      }
    ]
  },
  {
    path: '/admin/:pathMatch(.*)*',
    redirect: (to) => {
      const raw = to.params.pathMatch
      const suffix = Array.isArray(raw) ? raw.filter(Boolean).join('/') : String(raw || '')
      return suffix ? `/setting/${suffix}` : '/setting/flyability-rules'
    }
  },
  {
    path: '/setting',
    name: 'Setting',
    component: () => import('@/layout/AdminLayout.vue'),
    redirect: '/setting/flyability-rules',
    meta: {
      title: '系统设置',
      icon: 'setting',
      hidden: false
    },
    children: [
      {
        path: '/setting/threshold',
        redirect: '/setting/flyability-rules'
      },
      {
        path: '/setting/flyability-rules',
        name: 'FlyabilityRuleManagement',
        component: () => import('@/pages/Admin/FlyabilityRuleManagement.vue'),
        meta: {
          title: '适飞规则集'
        }
      },
      {
        path: '/setting/scheduler',
        name: 'SchedulerMaintenance',
        component: () => import('@/pages/Admin/SchedulerMaintenance.vue'),
        meta: {
          title: '调度运维'
        }
      },
      {
        path: '/setting/user',
        name: 'UserManagement',
        component: () => import('@/pages/Admin/UserManagement.vue'),
        meta: {
          title: '用户管理'
        }
      },
      {
        path: '/setting/aircraft',
        name: 'AircraftManagement',
        component: () => import('@/pages/Admin/AircraftManagement.vue'),
        meta: {
          title: '飞行器管理'
        }
      },
      {
        path: '/setting/landing-points',
        name: 'LandingPointManagement',
        component: () => import('@/pages/Admin/LandingPointManagement.vue'),
        meta: {
          title: '起降点管理'
        }
      },
      {
        path: '/setting/monitoring-point',
        redirect: '/setting/landing-points'
      },
      {
        path: '/setting/device',
        name: 'DeviceManagement',
        component: () => import('@/pages/Admin/DeviceManagement.vue'),
        meta: {
          title: '设备管理'
        }
      },
      {
        path: '/setting/camera',
        name: 'CameraManagement',
        component: () => import('@/pages/Admin/CameraManagement.vue'),
        meta: {
          title: '摄像头管理'
        }
      },
      {
        path: '/setting/regions',
        name: 'RegionManagement',
        component: () => import('@/pages/Admin/RegionManagement.vue'),
        meta: {
          title: '区域管理'
        }
      },
      {
        path: '/setting/region-config',
        redirect: '/setting/regions'
      }
    ]
  }
]

