<template>
  <aside class="layout-sidebar">
    <el-menu
      :default-active="activeRoute"
      class="sidebar-menu"
      mode="vertical"
      background-color="transparent"
      text-color="#ccc"
      active-text-color="#fff"
      @select="handleMenuSelect"
    >
      <!-- 使用递归组件渲染嵌套路由 -->
      <template v-for="item in displayRoutes" :key="item.path">
        <el-menu-item 
          v-if="!item.children || item.children.length === 0"
          :index="item.path"
        >
          <el-icon v-if="item.meta?.icon">
            <component :is="getIconComponent(item.meta.icon)" />
          </el-icon>
          <template #title>{{ item.meta?.title }}</template>
        </el-menu-item>
        <el-sub-menu 
          v-else
          :index="item.path"
        >
          <template #title>
            <el-icon v-if="item.meta?.icon">
              <component :is="getIconComponent(item.meta.icon)" />
            </el-icon>
            <span>{{ item.meta?.title }}</span>
          </template>
          <el-menu-item
            v-for="child in item.children"
            :key="child.path"
            :index="child.path"
          >
            <template #title>{{ child.meta?.title }}</template>
          </el-menu-item>
        </el-sub-menu>
      </template>
    </el-menu>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { routes } from '@/router/routes'
// 不使用局部导入，直接使用全局注册的图标组件

const router = useRouter()
const route = useRoute()

// 当前激活的路由
const activeRoute = computed(() => {
  return route.path
})

// 计算可显示的路由列表
const displayRoutes = computed(() => {
  // 获取顶层路由的children作为显示菜单
  const mainRoute = routes.find(r => r.path === '/')
  console.log(mainRoute?.children || []);
  
  return mainRoute?.children || []
})

// 处理菜单选择
const handleMenuSelect = (path) => {
  router.push(path)
}

// 直接返回全局注册的图标组件名称
const getIconComponent = (iconName) => {
  const iconMap = {
    'dashboard': 'Dashboard', // 对应路由中的 icon: 'dashboard'
    'setting': 'Setting'      // 对应路由中的 icon: 'setting'
  }
  return iconMap[iconName] || null // 找不到时返回 null（避免报错）
}
</script>

<style scoped lang="scss">
.layout-sidebar {
  width: 240px;
  height: 100%;
  background-color: rgba(15, 23, 51, 0.95);
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.3s ease;
  z-index: 5;
}

.sidebar-menu {
  height: 100%;
  border-right: none;
  background-color: transparent;

  :deep(.el-menu-item) {
    height: 60px;
    line-height: 60px;
    padding: 0 20px;
    color: #ccc;
    font-size: 16px;
    transition: all 0.3s ease;
    border-left: 3px solid transparent;
    margin: 0;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &.is-active {
      background-color: rgba(255, 255, 255, 0.15);
      color: #fff;
      border-left-color: #1890ff;
    }
  }

  :deep(.el-sub-menu__title) {
    height: 60px;
    line-height: 60px;
    padding: 0 20px;
    color: #ccc;
    font-size: 16px;
    transition: all 0.3s ease;
    border-left: 3px solid transparent;
    margin: 0;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &.is-active {
      background-color: rgba(255, 255, 255, 0.15);
      color: #fff;
      border-left-color: #1890ff;
    }
  }

  :deep(.el-sub-menu__icon-arrow) {
    color: #ccc;
  }

  :deep(.el-icon) {
    margin-right: 12px;
    font-size: 20px;
  }

  // 子菜单样式
  :deep(.el-menu--inline) {
    background-color: rgba(0, 0, 0, 0.2);

    .el-menu-item {
      padding: 0 40px !important;
      font-size: 14px !important;

      &.is-active {
        border-left-color: #1890ff;
        padding-left: 37px !important;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .layout-sidebar {
    width: 200px;
  }
  
  .sidebar-menu :deep(.el-menu-item),
  .sidebar-menu :deep(.el-sub-menu__title) {
    font-size: 14px;
    padding: 0 15px;
  }
  
  .sidebar-menu :deep(.el-menu--inline) .el-menu-item {
    padding: 0 35px !important;
  }
}

@media (max-width: 768px) {
  .layout-sidebar {
    width: 60px;
  }
  
  .sidebar-menu :deep(.el-menu-item),
  .sidebar-menu :deep(.el-sub-menu__title) {
    font-size: 12px;
    text-align: center;
    padding: 0;
  }
  
  .sidebar-menu :deep(.el-icon) {
    margin-right: 0;
  }
  
  .sidebar-menu :deep(.el-menu-item__content),
  .sidebar-menu :deep(.el-sub-menu__title > span:not(.el-sub-menu__icon-arrow)) {
    display: none;
  }
  
  .sidebar-menu :deep(.el-menu--inline) {
    position: absolute;
    left: 60px;
    top: 0;
    min-width: 180px;
  }
}
</style>