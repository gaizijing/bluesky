<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-icon">
        <el-icon :size="100"><WarningFilled /></el-icon>
      </div>
      <div class="error-info">
        <h1 class="error-code">{{ errorCode }}</h1>
        <p class="error-message">{{ errorMessage }}</p>
      </div>
      <div class="error-actions">
        <el-button 
          type="primary" 
          size="large"
          @click="handleBackHome"
        >
          返回首页
        </el-button>
        <el-button 
          type="default" 
          size="large"
          @click="handleRefresh"
        >
          刷新页面
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 错误码和信息
const errorCode = ref('404')
const errorMessage = ref('页面未找到')

// 返回首页
const handleBackHome = () => {
  router.push('/dashboard')
}

// 刷新页面
const handleRefresh = () => {
  window.location.reload()
}

// 根据路由参数设置错误信息
onMounted(() => {
  const code = route.query.code
  const msg = route.query.msg
  if (code) errorCode.value = code
  if (msg) errorMessage.value = msg
})
</script>

<style scoped lang="scss">
.error-page {
  width: 100%;
  height: 100vh;
  background-color: $background-color;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-container {
  text-align: center;
  padding: 40px;
  background-color: $panel-background;
  border-radius: 12px;
  border: 1px solid $border-color;
  width: 600px;
}

.error-icon {
  color: $warning;
  margin-bottom: 20px;
}

.error-info {
  margin-bottom: 30px;

  .error-code {
    font-size: 48px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 10px;
  }

  .error-message {
    font-size: 18px;
    color: #ccc;
  }
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>