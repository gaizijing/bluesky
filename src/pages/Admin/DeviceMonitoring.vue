<template>
  <div class="device-monitoring-page">
    <header class="admin-panel__header">
      <div>
        <h2 class="admin-panel__title">设备监测看板</h2>
        <p class="admin-panel__desc">
          原大屏「设备监控」模块图表，迁移至后台集中查看。区域切换请在「区域管理」中操作。
        </p>
      </div>
      <div class="admin-toolbar">
        <el-button :loading="loading" @click="refresh">刷新数据</el-button>
      </div>
    </header>

    <div class="device-monitoring-grid">
      <section class="device-monitoring-column">
        <div class="device-monitoring-card">
          <h3 class="device-monitoring-card__title">设备运行状态</h3>
          <DeviceCount />
        </div>
        <div class="device-monitoring-card">
          <h3 class="device-monitoring-card__title">告警情况</h3>
          <EquipmentAlarm />
        </div>
      </section>

      <section class="device-monitoring-column device-monitoring-column--wide">
        <div class="device-monitoring-card device-monitoring-card--fill">
          <h3 class="device-monitoring-card__title">历史 42h 实况监测数据</h3>
          <HistoryData />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { DeviceService } from '@/services/deviceService';

const DeviceCount = defineAsyncComponent(() =>
  import('@/components/business/DeviceCount/index.vue')
);
const EquipmentAlarm = defineAsyncComponent(() =>
  import('@/components/business/EquipmentAlarm/index.vue')
);
const HistoryData = defineAsyncComponent(() =>
  import('@/components/business/HistoryData/index.vue')
);

const deviceService = new DeviceService();
const loading = ref(false);

async function refresh() {
  loading.value = true;
  try {
    await Promise.all([
      deviceService.loadDeviceCount(),
      deviceService.loadEquipmentAlarm(),
      deviceService.loadHistoryData(),
    ]);
    ElMessage.success('设备监测数据已刷新');
  } catch (err) {
    console.error(err);
    ElMessage.error('刷新失败，请确认后端设备接口可用');
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<style scoped lang="scss">
.device-monitoring-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.device-monitoring-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.device-monitoring-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-monitoring-card {
  padding: 16px 18px 20px;
  border-radius: 20px;
  border: 1px solid rgba(135, 211, 255, 0.14);
  background: rgba(8, 24, 37, 0.86);
  box-shadow: 0 12px 35px rgba(2, 10, 18, 0.3);
  color: #ecf7ff;
}

.device-monitoring-card--fill {
  min-height: calc(100vh - 220px);
}

.device-monitoring-card__title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: rgba(236, 247, 255, 0.92);
}

@media (max-width: 1080px) {
  .device-monitoring-grid {
    grid-template-columns: 1fr;
  }

  .device-monitoring-card--fill {
    min-height: auto;
  }
}
</style>
