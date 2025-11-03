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
      <el-menu-item 
        v-for="route in routes" 
        :key="route.path" 
        :index="route.path"
        v-if="!route.meta.hidden"
      >
        <!-- 修正：通过组件形式使用图标，而非 class -->
        <el-icon>
          <!-- 根据 route.meta.icon 动态渲染图标组件 -->
          <component :is="getIconComponent(route.meta.icon)" />
        </el-icon>
        <template #title>{{ route.meta?.title }}</template>
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { routes } from '@/router/routes'
// 导入所需的 Element Plus 图标（对应路由中的 icon 值）
import { House, Setting } from '@element-plus/icons-vue' // 关键：导入图标组件

const router = useRouter()
const route = useRoute()

// 当前激活的路由
const activeRoute = computed(() => route.path)

// 处理菜单选择
const handleMenuSelect = (path) => {
  router.push(path)
}

// 关键：将 icon 字符串映射到图标组件
const getIconComponent = (iconName) => {
  const iconMap = {
    'dashboard': Dashboard, // 对应路由中的 icon: 'dashboard'
    'setting': Setting      // 对应路由中的 icon: 'setting'
  }
  return iconMap[iconName] || null // 找不到时返回 null（避免报错）
}
</script>