import axios from 'axios'
import { ElMessage, ElLoading } from 'element-plus'
import { getToken, removeToken } from './storageUtils'
import { clearStore } from '@/store'
import router from '@/router'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 加载实例（引用计数，避免并发请求反复弹出）
let loadingInstance = null
let loadingCount = 0
let authRedirecting = false

function startGlobalLoading() {
  loadingCount += 1
  if (loadingCount === 1) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: '加载中...',
      background: 'rgba(0, 0, 0, 0.3)',
    })
  }
}

function stopGlobalLoading() {
  loadingCount = Math.max(0, loadingCount - 1)
  if (loadingCount === 0) {
    loadingInstance?.close()
    loadingInstance = null
  }
}

function handleUnauthorized(message = '登录已过期，请重新登录') {
  if (authRedirecting) return
  authRedirecting = true
  removeToken()
  clearStore()
  const path = router.currentRoute.value?.path || ''
  if (path !== '/login') {
    ElMessage.warning(message)
    router.replace('/login').finally(() => {
      authRedirecting = false
    })
  } else {
    authRedirecting = false
  }
}

const REGION_SCOPED_PREFIXES = [
  '/landing-points',
  '/routes',
  '/no-fly-zones',
  '/warnings',
  '/weather/grid-field',
]

function readRegionIdForRequest() {
  try {
    const raw = localStorage.getItem('currentRegionId')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null
  } catch {
    return null
  }
}

function needsRegion(url = '') {
  const path = String(url).split('?')[0]
  return REGION_SCOPED_PREFIXES.some((prefix) => path.startsWith(prefix))
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toLowerCase()
    const showLoading = config.showLoading === true
      || (config.showLoading !== false && !config.skipLoading && method !== 'get')

    if (showLoading) {
      config.__showLoading = true
      startGlobalLoading()
    }

    // 添加token
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const regionId = readRegionIdForRequest()
    if (regionId && needsRegion(config.url) && !config.params?.regionId) {
      config.params = { ...(config.params || {}), regionId }
    }

    // 如果是本地静态资源请求（/data/ 开头），清空 baseURL
    if (config.url?.startsWith('/cesium/')) {
      config.baseURL = ''; // 确保请求直接指向前端 Vite 服务的静态文件
    }
    return config
  },
  (error) => {
    if (error.config?.__showLoading) {
      stopGlobalLoading()
    }
    ElMessage.error('请求错误：' + error.message)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    if (response.config?.__showLoading) {
      stopGlobalLoading()
    }
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
    if (res.code === 401 && !requestUrl.includes('/auth/login')) {
      handleUnauthorized(res.message || '登录已过期，请重新登录')
      return Promise.reject(new Error(res.message || 'Unauthorized'))
    }

    // 其他错误
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    if (error.config?.__showLoading) {
      stopGlobalLoading()
    }

    if (!error.response) {
      ElMessage.error('网络连接异常，请检查网络')
      return Promise.reject(error)
    }

    const status = error.response.status
    const requestUrl = error.config?.url || ''
    const body = error.response.data
    const bodyCode = body?.code

    if ((status === 401 || bodyCode === 401) && !requestUrl.includes('/auth/login')) {
      handleUnauthorized(body?.message || '未登录或 Token 无效')
      return Promise.reject(error)
    }

    ElMessage.error(body?.message || `服务器错误：${status}`)
    return Promise.reject(error)
  }
)

/** 统一 query 参数：request.get(url, { regionId }) 而非 axios 风格的 { params: { regionId } } */
function normalizeQueryParams(params) {
  if (params == null) return {};
  if (
    typeof params === 'object' &&
    !Array.isArray(params) &&
    params.params &&
    typeof params.params === 'object' &&
    !Array.isArray(params.params)
  ) {
    return params.params;
  }
  return params;
}

// 封装请求方法
const request = {
  get(url, params = {}, config = {}) {
    return service.get(url, { ...config, params: normalizeQueryParams(params) });
  },

  post(url, data = {}, config = {}) {
    return service.post(url, data, config);
  },

  put(url, data = {}, config = {}) {
    return service.put(url, data, config);
  },

  delete(url, params = {}, config = {}) {
    return service.delete(url, { ...config, params: normalizeQueryParams(params) });
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