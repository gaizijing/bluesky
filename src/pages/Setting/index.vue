<template>
  <!-- 设置页面主容器 -->
  <div class="setting-page">
    <!-- 路由视图，用于显示子路由内容 -->
    <router-view />
  </div>
</template>

<script setup>
// 主设置页面，作为子路由的容器
</script>

<style scoped lang="scss">
.setting-page {
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}
</style>