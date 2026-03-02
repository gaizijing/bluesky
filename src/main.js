// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'  // 导入路由
import store from './store'    // 导入Pinia store实例（关键）
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/index.scss'
import 'vue-cesium/dist/index.css'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 设置Cesium配置（必须）
if (import.meta.env.VITE_CESIUM_BASE_URL) {
  window.CESIUM_BASE_URL = import.meta.env.VITE_CESIUM_BASE_URL;
} else {
  window.CESIUM_BASE_URL = '/cesium';
}

// 设置Cesium Ion token（必须）
if (import.meta.env.VITE_CESIUM_TOKEN) {
  window.CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;
}

const app = createApp(App)

// 全局注册 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 直接使用store实例，无需setupStore
app.use(store)  // 挂载Pinia
app.use(router) // 挂载路由
app.use(ElementPlus)

// 挂载应用
app.mount('#app')

// 应用挂载后初始化数据
import { InitializationService } from './services/initialization'
import { PollingService } from './services/polling'

// 初始化应用数据
async function initializeApp() {
  const initializationService = new InitializationService();
  const pollingService = new PollingService();

  try {
    // 开始初始化
    await initializationService.initialize();
    
    // 启动轮询
    pollingService.start();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}

// 调用初始化函数
initializeApp()