<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="logo">
          <img src="/logo.png" alt="系统Logo" />
        </div>
        <h1 class="title">气象服务系统</h1>
        <p class="subtitle">专业的低空气象监测与分析平台</p>
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" prefix-icon="el-icon-user" size="large"
            autocomplete="off" @keyup.enter="handleLogin" autofocus />
        </el-form-item>

        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" prefix-icon="el-icon-lock"
            size="large" show-password autocomplete="off" @keyup.enter="handleLogin" />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="loginForm.remember">记住密码</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" size="large" class="login-btn">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>© 2024 气象服务系统</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { userLogin } from '@/api/auth'
import { setToken } from '@/utils/storageUtils'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    loading.value = true
    // 调用登录API
    const response = await userLogin(loginForm)
    
    // 检查登录是否成功
    if (response.success) {
      // 登录成功，保存token
      setToken(response.token)      
      
      // 保存用户角色信息
      const userRole = response.userInfo?.role || 'user'
      console.log(userRole);
      
      localStorage.setItem('userRole', userRole)
      
      // 记住密码（实际项目中应加密存储）
      if (loginForm.remember) {
        localStorage.setItem('username', loginForm.username)
      } else {
        localStorage.removeItem('username')
      }
      
      ElMessage.success('登录成功')
      // 根据角色跳转不同页面
      if (userRole === 'admin') {
        router.push('/setting')
      } else {
        router.push('/dashboard')
      }
    } else {
      // 登录失败
      ElMessage.error(response.message || '登录失败，请检查用户名和密码')
    }

  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error.message || '登录失败，请重试')
  } finally {
    loading.value = false
  }
}

// 页面加载时，检查是否有记住的用户名
onMounted(() => {
  const savedUsername = localStorage.getItem('username')
  if (savedUsername) {
    loginForm.username = savedUsername
    loginForm.remember = true
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background-image: url('@/assets/images/bg_login.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-box {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 100%;
  max-width: 420px;
  padding: 40px 30px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  margin-bottom: 20px;
}

.logo img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.login-form {
  margin-bottom: 20px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.login-btn {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  font-size: 16px;
}

.login-footer {
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>