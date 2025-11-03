/**
 * 本地存储工具类
 * 封装 localStorage 和 sessionStorage 的常用操作，自动处理 JSON 序列化/反序列化
 */

// 存储类型枚举（localStorage 持久化存储；sessionStorage 会话级存储）
const STORAGE_TYPE = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage'
}

/**
 * 设置存储项
 * @param {string} key - 存储键名
 * @param {any} value - 存储值（支持任意类型，会自动 JSON 序列化）
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const setStorage = (key, value, type = STORAGE_TYPE.LOCAL) => {
  try {
    const storage = window[type]
    if (!storage) throw new Error(`不支持 ${type} 存储`)
    // 序列化值（处理对象/数组等类型）
    const storedValue = JSON.stringify(value)
    storage.setItem(key, storedValue)
  } catch (error) {
    console.error(`设置存储项 ${key} 失败:`, error)
  }
}

/**
 * 获取存储项
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 默认值（获取失败时返回）
 * @param {string} type - 存储类型（默认 localStorage）
 * @returns {any} 存储值（自动 JSON 反序列化，失败返回默认值）
 */
export const getStorage = (key, defaultValue = null, type = STORAGE_TYPE.LOCAL) => {
  try {
    const storage = window[type]
    if (!storage) throw new Error(`不支持 ${type} 存储`)
    const storedValue = storage.getItem(key)
    if (storedValue === null) return defaultValue
    // 反序列化值（还原对象/数组等类型）
    return JSON.parse(storedValue)
  } catch (error) {
    console.error(`获取存储项 ${key} 失败:`, error)
    return defaultValue
  }
}

/**
 * 删除存储项
 * @param {string} key - 存储键名
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const removeStorage = (key, type = STORAGE_TYPE.LOCAL) => {
  try {
    const storage = window[type]
    if (!storage) throw new Error(`不支持 ${type} 存储`)
    storage.removeItem(key)
  } catch (error) {
    console.error(`删除存储项 ${key} 失败:`, error)
  }
}

/**
 * 清空所有存储项
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const clearStorage = (type = STORAGE_TYPE.LOCAL) => {
  try {
    const storage = window[type]
    if (!storage) throw new Error(`不支持 ${type} 存储`)
    storage.clear()
  } catch (error) {
    console.error(`清空 ${type} 存储失败:`, error)
  }
}

/**
 * 判断存储项是否存在
 * @param {string} key - 存储键名
 * @param {string} type - 存储类型（默认 localStorage）
 * @returns {boolean} 是否存在
 */
export const hasStorage = (key, type = STORAGE_TYPE.LOCAL) => {
  try {
    const storage = window[type]
    if (!storage) throw new Error(`不支持 ${type} 存储`)
    return storage.getItem(key) !== null
  } catch (error) {
    console.error(`判断存储项 ${key} 是否存在失败:`, error)
    return false
  }
}

// ------------------------------
// 以下是针对 Token 的专用方法（项目常用）
// ------------------------------

/**
 * 设置 Token（默认用 localStorage 持久化存储）
 * @param {string} token - 令牌值
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const setToken = (token, type = STORAGE_TYPE.LOCAL) => {
  setStorage('token', token, type)
}

/**
 * 获取 Token
 * @param {string} type - 存储类型（默认 localStorage）
 * @returns {string|null} Token 值（不存在返回 null）
 */
export const getToken = (type = STORAGE_TYPE.LOCAL) => {
  return getStorage('token', null, type)
}

/**
 * 删除 Token
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const removeToken = (type = STORAGE_TYPE.LOCAL) => {
  removeStorage('token', type)
}

// ------------------------------
// 以下是针对用户信息的专用方法（扩展用）
// ------------------------------

/**
 * 设置用户信息
 * @param {object} userInfo - 用户信息对象
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const setUserInfo = (userInfo, type = STORAGE_TYPE.LOCAL) => {
  setStorage('userInfo', userInfo, type)
}

/**
 * 获取用户信息
 * @param {string} type - 存储类型（默认 localStorage）
 * @returns {object|null} 用户信息（不存在返回 null）
 */
export const getUserInfo = (type = STORAGE_TYPE.LOCAL) => {
  return getStorage('userInfo', null, type)
}

/**
 * 删除用户信息
 * @param {string} type - 存储类型（默认 localStorage）
 */
export const removeUserInfo = (type = STORAGE_TYPE.LOCAL) => {
  removeStorage('userInfo', type)
}