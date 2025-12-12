import request from '../utils/request';

/**
 * 用户登录
 * @param {Object} loginData - 登录信息
 * @param {string} loginData.username - 用户名
 * @param {string} loginData.password - 密码
 * @returns {Promise<Object>} 登录结果
 */
export const userLogin = async (loginData) => {
  try {
    // 在实际项目中，这里会是真实的API调用:
    // const response = await request.post('/api/auth/login', loginData);
    
    // 模拟登录请求
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟登录成功
        if (loginData.username === 'admin' && loginData.password === 'admin123') {
          resolve({
            token: 'fake-token-' + Date.now(),
            userInfo: {
              id: 'user-1',
              username: 'admin',
              name: '系统管理员',
              role: 'admin',
              permissions: ['dashboard', 'setting', 'map']
            }
          });
        } else {
          // 模拟登录失败
          reject(new Error('用户名或密码错误'));
        }
      }, 1000);
    });
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

/**
 * 用户登出
 * @returns {Promise<Object>} 登出结果
 */
export const userLogout = async () => {
  try {
    // 在实际项目中，这里会是真实的API调用:
    // const response = await request.post('/api/auth/logout');
    
    // 模拟登出请求
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  } catch (error) {
    console.error('登出失败:', error);
    throw error;
  }
};

/**
 * 获取用户信息
 * @returns {Promise<Object>} 用户信息
 */
export const getUserInfo = async () => {
  try {
    // 在实际项目中，这里会是真实的API调用:
    // const response = await request.get('/api/auth/userInfo');
    
    // 模拟获取用户信息
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'user-1',
          username: 'admin',
          name: '系统管理员',
          role: 'admin',
          permissions: ['dashboard', 'setting', 'map'],
          lastLoginTime: new Date().toISOString()
        });
      }, 500);
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
};