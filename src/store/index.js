// src/store/index.js
import { createPinia } from 'pinia'
import { resetRouter } from '@/router'

// 创建Pinia实例
const store = createPinia()

// 清除所有状态的方法（可选，按需使用）
export const clearStore = () => {
  const allStores = store._s
  Object.values(allStores).forEach(store => {
    store.$reset()
  })
  resetRouter()
}

// 导出默认的store实例（供main.js使用）
export default store