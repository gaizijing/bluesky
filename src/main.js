// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/index.scss'
import 'vue-cesium/dist/index.css'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

if (import.meta.env.VITE_CESIUM_BASE_URL) {
  window.CESIUM_BASE_URL = import.meta.env.VITE_CESIUM_BASE_URL;
} else {
  window.CESIUM_BASE_URL = '/cesium';
}

if (import.meta.env.VITE_CESIUM_TOKEN) {
  window.CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;
}

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(store)
app.use(router)
app.use(ElementPlus)
app.mount('#app')

import { InitializationService } from './services/initialization'
import { getToken } from './utils/storageUtils'

const initializationService = new InitializationService();

async function initializeApp() {
  const route = router.currentRoute.value
  if (!getToken() || route.path === '/login') {
    return
  }
  try {
    await initializationService.initialize()
  } catch (error) {
    console.error('App initialization failed:', error)
  }
}

router.isReady().then(() => {
  initializeApp()

  router.afterEach((to, from) => {
    if (getToken() && from.path === '/login' && to.path !== '/login') {
      initializationService.initialize().catch((err) => {
        console.warn('登录后初始化失败:', err)
      })
    }
  })
})