<!-- 父组件：上下布局压缩版 -->
<template>
  <div class="wind-dashboard compact-mode">

    
    <!-- 上下显示两个子组件 -->
    <div class="dashboard-content">
      <!-- 上方：风趋势卡片 -->
      <div class="dashboard-panel trend-panel">
        <WindTrend />
      </div>
      
      <!-- 下方：风廓线图表 -->
      <div class="dashboard-panel profile-panel">
        <WindProfileChart />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref ,defineAsyncComponent } from 'vue';
const WindProfileChart = defineAsyncComponent(() =>
  import("@/components/business/WindProfileChart/index.vue")
);
const WindTrend = defineAsyncComponent(() =>
  import("@/components/business/WindTrend/index.vue")
);
const updateTime = ref(new Date().toLocaleString('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}));
</script>

<style scoped lang="scss">
.wind-dashboard {
  width: 100%;

  &.compact-mode {
    .dashboard-header {
      margin-bottom: 8px;
      padding: 0 5px;
      
      h2 {
        font-size: 16px;
        line-height: 1;
      }
      
      .update-time {
        font-size: 12px;
      }
    }
  }
}

.dashboard-content {
  display: flex;
  flex-direction: column; /* 改为上下布局 */
  width: 100%;
}


.trend-panel {
  height: 120px; /* 压缩高度 */
}

.profile-panel {
  height: 220px; /* 压缩高度 */
}
</style>