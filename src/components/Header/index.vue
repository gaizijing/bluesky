<template>
  <header class="layout-header">
    <div class="logo-text">{{ appTitle }}</div>
    <div class="header-right">
      <div class="current-time">{{ currentTime }}</div>
      <el-dropdown trigger="click">
        <div class="user-info">
          <el-avatar :icon="UserFilled" class="user-avatar" />
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleSetting">
              <img src="@/assets/icons/ic_setting.png" class="custom-icon" />
              <span>系统设置</span>
            </el-dropdown-item>
            <el-dropdown-item @click="handleLogout">
              <img src="@/assets/icons/ic_exit.png" class="custom-icon" />
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { formatDate } from "@/utils/dateUtils";
import { useCurrentTime } from "@/hooks/useTime";

const { currentTime } = useCurrentTime();
// 应用标题
const appTitle = import.meta.env.VITE_APP_TITLE;

const router = useRouter();

// 跳转设置页面
const handleSetting = () => {
  router.push("/setting");
};

// 退出登录
const handleLogout = () => {
  // 实际项目中添加退出登录逻辑（清除token、状态等）
  router.push("/login");
};
</script>

<style scoped lang="scss">
.layout-header {
  width: 100%;
  height: $header-height;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  position: relative;
  color: $header-color;
  font-family: "jingangFont";
  font-style: italic;
}

.header-logo {
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;

  .logo-img {
    height: 36px;
    width: auto;
  }
}
.logo-text {
  font-size: $font-size-title;
  margin: 0 auto;
  /* text-shadow: 水平偏移 垂直偏移 模糊半径 发光颜色; */
  text-shadow: 0 0 6px rgba(34, 101, 255, 0.3), 0 0 12px #182e3f;
}

.header-right {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  text-shadow: 0 0 6px rgba(34, 101, 255, 0.3), 0 0 12px #182e3f;
  font-size: $font-size-medium;
  .user-avatar {
    background-color: $primary;
  }
}
.custom-icon {
  width: 30px; /* 图标宽度（根据实际图标大小调整） */
}
</style>