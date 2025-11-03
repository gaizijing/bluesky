<template>
  <div class="main-layout">
    <!-- 头部 -->
    <!-- <Header/> -->
    <!-- 主体内容 -->
    <div class="layout-content">
      <!-- 侧边栏 -->
      <Sidebar />
      <!-- 主内容区 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
</script>

<style scoped lang="scss">
.main-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $background-color;
  overflow: hidden;
}

.layout-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}
</style>