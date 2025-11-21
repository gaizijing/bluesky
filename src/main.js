// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'  // 导入路由
import store from './store'    // 导入Pinia store实例（关键）
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/index.scss'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 全局注册 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 直接使用store实例，无需setupStore
app.use(store)  // 挂载Pinia
app.use(router) // 挂载路由
app.use(ElementPlus)

app.mount('#app')