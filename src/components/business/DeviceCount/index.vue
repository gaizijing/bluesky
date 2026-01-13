<template>
  <div>

    <div class="panel-subtitle">设备标题</div>
    <div class="device-count-content">
      <div v-for="item in deviceStatus" :key="item.type" class="device-count-item">
        <div class="device-count">
          <img src="@/assets/images/btn_img3.png" alt="" class="device-count-icon" />
          <div class="device-count-number">
            {{ item.online }}/{{ item.total }}
          </div>
        </div>
        <div class="device-count-name">
          <img src="@/assets/images/dividing_line.png" alt="" style="width:100%; height: 15px" />

          {{ item.name }}
        </div>
      </div>
    </div>
    <div class="panel-subtitle">
      设备在线率</div>
    <div class="device-count-content">
      <div v-for="item in deviceStatus" :key="item.type" class="device-count-item">
        <div class="device-count device-count-bg">
          <span class="device-count-percentage">
            {{ (item.online / item.total) * 100 }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useDeviceStore } from '@/store/modules/device';
const deviceStatus = computed(() => {
  return useDeviceStore().getDeviceCount();
});

</script>
<style scoped lang="scss">
.panel-subtitle {
  background-image: url("@/assets/images/bg_panel_subtitle.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  //width: 100px;
  text-align: center;
  width: 100px;
  font-family: 'AideepFont';
  font-weight: bold;
  font-size: 14px
}

.device-count-content {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  align-items: center;
  gap: 5px;

  .device-count-item {
    text-align: center;
    flex: 1;
  }
}

.device-count {
  position: relative;
  display: flex;
  text-align: center;
  justify-content: center;

  .device-count-icon {
    width: 30px;
    height: 30px;
  }

  .device-count-number {
    font-size: 28px;
    margin-left: 5px;
  }
}

.device-count-name {
  font-size: 10px;
}

.device-count-percentage {
  font-size: 16px;
  margin-left: 5px;
  position: absolute;
  left: 40px;
  top: 10px;
  color: #84cdf3bd;
  font-style: italic;
}

.device-count-bg {
  background-image: url("@/assets/images/percentage.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  height: 70px;
}
</style>