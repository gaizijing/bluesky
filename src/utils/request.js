import axios from 'axios'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import { getToken, removeToken } from './storageUtils'
import { clearStore } from '@/store'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 加载实例
let loadingInstance = null

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 显示加载
    loadingInstance = ElLoading.service({
      lock: true,
      text: '加载中...',
      background: 'rgba(0, 0, 0, 0.3)'
    })

    // 添加token
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 如果是本地静态资源请求（/data/ 开头），清空 baseURL
    if (config.url?.startsWith('/cesium/')) {
      config.baseURL = ''; // 确保请求直接指向前端 Vite 服务的静态文件
    }
    return config
  },
  (error) => {
    loadingInstance?.close()
    ElMessage.error('请求错误：' + error.message)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    loadingInstance?.close()
    // 1. 识别本地文件请求：根据URL特征判断
    // --------------------------
    const requestUrl = response.config.url || ''
    // 本地文件请求特征：假设本地文件都在 /data/ 路径下（如 public/data/xxx.geojson）
    const isLocalFile = requestUrl.startsWith('/cesium/')
    // 也可以根据“是否包含后端基础路径”判断：
    // const isLocalFile = !requestUrl.startsWith(import.meta.env.VITE_API_BASE_URL)

    // 2. 本地文件请求：直接返回原始响应数据（不做拦截处理）
    if (isLocalFile) {
      return response.data // 本地文件通常直接返回JSON数据，无需处理code
    }



    const res = response.data

    // 成功状态码
    if (res.code === 200 || res.code === 304) {
      return res.data
    }
    // 缓存状态码
    if (res.code === 304) {
      return res
    }
    // 未登录
    if (res.code === 401) {
      ElMessageBox.confirm('登录已过期，请重新登录', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        removeToken()
        clearStore()
        window.location.reload()
      })
      return Promise.reject(new Error(res.message || 'Error'))
    }

    // 其他错误
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    loadingInstance?.close()

    // 网络错误
    if (!error.response) {
      ElMessage.error('网络连接异常，请检查网络')
      return Promise.reject(error)
    }

    // 服务器错误
    ElMessage.error(`服务器错误：${error.response.status}`)
    return Promise.reject(error)
  }
)

// 封装请求方法
const request = {
  get(url, params = {}, config = {}) {
    return service.get(url, { params, ...config })
  },

  post(url, data = {}, config = {}) {
    return service.post(url, data, config)
  },

  put(url, data = {}, config = {}) {
    return service.put(url, data, config)
  },

  delete(url, params = {}, config = {}) {
    return service.delete(url, { params, ...config })
  },

  // 上传文件
  upload(url, file, onUploadProgress) {
    const formData = new FormData()
    formData.append('file', file)

    return service.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    })
  }
}

export default request