<template>
  <div class="main-layout">
    <!-- 头部（Dashboard 全屏壳层自带 Header） -->
    <div v-if="!isFullscreenRoute" class="layout-top">
      <Header />
    </div>
    <!-- 主体内容 -->
    <div class="layout-content" :class="{ 'layout-content--fullscreen': isFullscreenRoute }">
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Header from './Header.vue'

const route = useRoute()
const isFullscreenRoute = computed(() => Boolean(route.meta.fullscreen))
</script>

<style scoped lang="scss">
.main-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: url("@/assets/images/bg_main_layout.png");
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.layout-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: $header-height;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(15, 23, 51, 0.7);
  z-index: 10;
  background: url("@/assets/images/bg_header.png");
  background-size: cover;
  background-position: center;
}

.layout-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// 侧边栏样式
.sidebar {
  width: 240px;
  height: 100%;
  background-color: rgba(15, 23, 51, 0.95);
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.3s ease;
  z-index: 5;
}

.main-content {
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.layout-content--fullscreen {
  flex: 1;
}
</style>