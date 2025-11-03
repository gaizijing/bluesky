<template>
  <header class="layout-header">
    <div class="header-logo">
      <img src="@/assets/icons/logo.png" alt="logo" class="logo-img" />
      <span class="logo-text">{{ appTitle }}</span>
    </div>
    <div class="header-right">
      <div class="current-time">{{ currentTime }}</div>
      <el-dropdown>
        <div class="user-info" trigger="click">
          <el-avatar icon="User" class="user-avatar" />
          <span class="user-name">管理员</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleSetting">
              <el-icon><Setting /></el-icon>
              <span>系统设置</span>
            </el-dropdown-item>
            <el-dropdown-item @click="handleLogout">
              <el-icon><Logout /></el-icon>
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/dateUtils'

// 应用标题
const appTitle = import.meta.env.VITE_APP_TITLE
// 当前时间
const currentTime = ref('')
const router = useRouter()

// 更新时间
const updateTime = () => {
  currentTime.value = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')
}

// 跳转设置页面
const handleSetting = () => {
  router.push('/setting')
}

// 退出登录
const handleLogout = () => {
  // 实际项目中添加退出登录逻辑（清除token、状态等）
  router.push('/login')
}

// 初始化时间
onMounted(() => {
  updateTime()
  const timer = setInterval(updateTime, 1000)
  onUnmounted(() => clearInterval(timer))
})
</script>

<style scoped lang="scss">
.layout-header {
  height: $header-height;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: $panel-background;
  border-bottom: 1px solid $border-color;
  box-sizing: border-box;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;

  .logo-img {
    height: 36px;
    width: auto;
  }

  .logo-text {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;

  .current-time {
    color: #fff;
    font-size: 14px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #fff;

    .user-avatar {
      background-color: $primary;
    }
  }
}
</style>