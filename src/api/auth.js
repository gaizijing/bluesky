import request from '../utils/request';
import { setToken, getToken,removeToken } from '../utils/storageUtils';

/**
 * 用户登录
 * @param {Object} loginData - 登录信息
 * @param {string} loginData.username - 用户名
 * @param {string} loginData.password - 密码
 * @returns {Promise<Object>} 登录结果
 */
export const userLogin = async (loginData) => {
  try {
    const response = await request.post('/auth/login', loginData);

    // 后端成功登录时返回 token 和 userInfo，没有 success 字段
    // 检查是否有 token 和 userInfo 来判断登录是否成功
    if (response && response.token && response.userInfo) {
      // 使用工具函数存储token
      setToken(response.token);

      // 返回登录结果
      return {
        success: true,
        token: response.token,
        userInfo: response.userInfo
      };
    } else {
      // 响应格式不正确（没有 token 或 userInfo）
      console.error('登录响应格式错误:', response);
      return {
        success: false,
        message: '登录响应格式错误'
      };
    }
  } catch (error) {
    console.error('登录失败:', error);
    // 处理网络错误等异常情况
    return {
      success: false,
      message: error.message || '用户名或密码错误'
    };
  }
};

/**
 * 用户登出
 * @returns {Promise<Object>} 登出结果
 */
export const userLogout = async () => {
  try {
    // 调用真实的登出API
    const response = await request.post('/auth/logout');
    
    // 清除本地存储的token
    removeToken();
    console.log(111111111111,getToken());
    
    // 返回登出结果
    return {
      success: true,
      message: '登出成功'
    };
  } catch (error) {
    console.error('登出失败:', error);
    // 即使API调用失败，也清除本地token
    removeToken();
    throw error;
  }
};

/**
 * 获取用户信息
 * @returns {Promise<Object>} 用户信息
 */
export const getUserInfo = async () => {
  try {
    // 调用真实的获取用户信息API
    const response = await request.get('/api/auth/userInfo');
    
    // 检查响应格式
    if (response && (response.userInfo || response.id)) {
      return response.userInfo || response;
    } else {
      console.error('获取用户信息响应格式错误:', response);
      throw new Error('获取用户信息失败');
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
};