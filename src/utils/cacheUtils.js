/**
 * 缓存工具类
 * 用于缓存API请求数据，避免频繁调用和风天气API导致配额耗尽
 */

class CacheUtils {
  constructor() {
    // 内存缓存存储
    this.memoryCache = new Map();
    // 默认缓存时间（毫秒）
    this.DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5分钟
  }

  /**
   * 生成缓存键
   * @param {string} prefix - 缓存键前缀
   * @param {*} params - 请求参数
   * @returns {string} 生成的缓存键
   */
  generateKey(prefix, params) {
    try {
      const paramsStr = typeof params === 'string' ? params : JSON.stringify(params);
      return `${prefix}_${paramsStr}`;
    } catch (error) {
      console.error('生成缓存键失败:', error);
      return `${prefix}_${Date.now()}`; // 降级方案
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} duration - 缓存时长（毫秒），默认5分钟
   * @param {boolean} useLocalStorage - 是否使用localStorage
   */
  set(key, value, duration = this.DEFAULT_CACHE_DURATION, useLocalStorage = false) {
    const cacheItem = {
      value,
      expiry: Date.now() + duration
    };

    // 内存缓存
    this.memoryCache.set(key, cacheItem);

    // 如果需要，同时存储到localStorage
    if (useLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(cacheItem));
      } catch (error) {
        console.error('存储到localStorage失败:', error);
        // 处理localStorage满了的情况
        this.clearOldestLocalStorage();
      }
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @param {boolean} useLocalStorage - 是否从localStorage读取
   * @returns {*} 缓存的值，如果过期或不存在则返回null
   */
  get(key, useLocalStorage = false) {
    // 先从内存缓存获取
    let cacheItem = this.memoryCache.get(key);
    
    // 如果内存缓存没有，且允许使用localStorage，则从localStorage获取
    if (!cacheItem && useLocalStorage) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          cacheItem = JSON.parse(stored);
          // 同步到内存缓存
          this.memoryCache.set(key, cacheItem);
        }
      } catch (error) {
        console.error('从localStorage读取失败:', error);
      }
    }

    // 检查是否过期
    if (cacheItem && Date.now() <= cacheItem.expiry) {
      return cacheItem.value;
    }

    // 过期或不存在，删除缓存
    this.remove(key, useLocalStorage);
    return null;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @param {boolean} useLocalStorage - 是否从localStorage删除
   */
  remove(key, useLocalStorage = false) {
    // 从内存缓存删除
    this.memoryCache.delete(key);

    // 如果需要，同时从localStorage删除
    if (useLocalStorage) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('从localStorage删除失败:', error);
      }
    }
  }

  /**
   * 清除所有内存缓存
   */
  clearMemoryCache() {
    this.memoryCache.clear();
  }

  /**
   * 清除所有localStorage缓存（可选择前缀过滤）
   * @param {string} prefix - 可选的前缀过滤
   */
  clearLocalStorageCache(prefix = '') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          localStorage.removeItem(key);
          // 因为删除会改变索引，需要调整i
          i--;
        }
      }
    } catch (error) {
      console.error('清除localStorage缓存失败:', error);
    }
  }

  /**
   * 清除过期的缓存
   * @param {boolean} includeLocalStorage - 是否包含localStorage
   */
  clearExpired(includeLocalStorage = false) {
    const now = Date.now();
    
    // 清除内存中过期的缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        this.memoryCache.delete(key);
      }
    }

    // 如果需要，清除localStorage中过期的缓存
    if (includeLocalStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              const item = JSON.parse(localStorage.getItem(key));
              if (item && now > item.expiry) {
                localStorage.removeItem(key);
                i--;
              }
            } catch (e) {
              // 解析失败的项，可能不是我们的缓存格式，跳过
            }
          }
        }
      } catch (error) {
        console.error('清除localStorage过期缓存失败:', error);
      }
    }
  }

  /**
   * 当localStorage满时，删除最早的缓存项
   * @private
   */
  clearOldestLocalStorage() {
    try {
      const keys = [];
      const now = Date.now();
      
      // 收集所有缓存键和过期时间
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.expiry) {
              keys.push({ key, expiry: item.expiry });
            }
          } catch (e) {
            // 忽略非缓存项
          }
        }
      }
      
      // 按过期时间排序
      keys.sort((a, b) => a.expiry - b.expiry);
      
      // 删除最旧的20%缓存项
      const deleteCount = Math.max(1, Math.floor(keys.length * 0.2));
      for (let i = 0; i < deleteCount; i++) {
        localStorage.removeItem(keys[i].key);
      }
    } catch (error) {
      console.error('清理localStorage空间失败:', error);
    }
  }

  /**
   * 缓存装饰器：用于装饰异步函数，自动缓存其返回结果
   * @param {Function} asyncFunc - 要装饰的异步函数
   * @param {Object} options - 配置选项
   * @param {string} options.prefix - 缓存键前缀
   * @param {number} options.duration - 缓存时长
   * @param {boolean} options.useLocalStorage - 是否使用localStorage
   * @returns {Function} 装饰后的函数
   */
  cacheAsync(asyncFunc, { prefix, duration, useLocalStorage } = {}) {
    return async (...args) => {
      // 生成缓存键
      const cacheKey = this.generateKey(prefix || asyncFunc.name, args);
      
      // 尝试从缓存获取
      const cachedResult = this.get(cacheKey, useLocalStorage);
      if (cachedResult !== null) {
        console.log(`从缓存获取: ${cacheKey}`);
        return cachedResult;
      }
      
      // 执行原函数
      const result = await asyncFunc(...args);
      
      // 缓存结果
      this.set(cacheKey, result, duration, useLocalStorage);
      console.log(`缓存结果: ${cacheKey}`);
      
      return result;
    };
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计信息
   */
  getStats() {
    let localStorageCount = 0;
    let localStorageSize = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          localStorageCount++;
          localStorageSize += (key.length + value.length) * 2; // 粗略估算字符串大小
        }
      }
    } catch (error) {
      console.error('获取localStorage统计信息失败:', error);
    }
    
    return {
      memoryCacheCount: this.memoryCache.size,
      localStorageCount,
      localStorageSize: Math.round(localStorageSize / 1024) + 'KB' // 转换为KB
    };
  }
}

// 创建单例实例
const cacheUtils = new CacheUtils();

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  cacheUtils.clearExpired(true);
}, 5 * 60 * 1000);

export default cacheUtils;

// 导出常用方法作为便捷函数
export const setCache = (...args) => cacheUtils.set(...args);
export const getCache = (...args) => cacheUtils.get(...args);
export const removeCache = (...args) => cacheUtils.remove(...args);
export const clearMemoryCache = () => cacheUtils.clearMemoryCache();
export const clearLocalStorageCache = (...args) => cacheUtils.clearLocalStorageCache(...args);

// 单独导出 cacheAsync 函数，确保正确绑定 this 上下文
export const cacheAsync = (asyncFunc, options) => cacheUtils.cacheAsync(asyncFunc, options);