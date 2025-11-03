<template>
  <div>
    <div class="panel-header">
      <span class="panel-title">设备运行状态</span>
    </div>
    <div class="panel-subtitle">设备标题</div>
    <div class="device-count-content">
      <div
        v-for="item in deviceStatus"
        :key="item.type"
        class="device-count-item"
      >
        <div class="device-count">
          <img
            src="@/assets/images/btn_img3.png"
            alt=""
            class="device-count-icon"
          />
          <div class="device-count-number">
            {{ item.online }}/{{ item.total }}
          </div>
        </div>
        <div class="device-count-name">
          <img
            src="@/assets/images/dividing_line.png"
            alt=""
            style="width:100%; height: 15px"
          />

          {{ item.name }}
        </div>
      </div>
    </div>
    <div class="panel-subtitle">
        设备在线率</div>
    <div class="device-count-content">
      <div
        v-for="item in deviceStatus"
        :key="item.type"
        class="device-count-item"
      >
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
import { ref, onMounted, watch, computed } from "vue";

// 设备状态数据
const deviceStatus = ref([
  {
    type: "weatherStation",
    name: "自动气象站",
    online: 3,
    total: 4,
    status: "normal",
    icon: "btn_img2",
  },
  {
    type: "windLidarSmall",
    name: "激光测风雷达",
    online: 4,
    total: 4,
    status: "normal",
    icon: "btn_img3",
  },
  {
    type: "windLidar3D",
    name: "三维激光测风雷达",
    online: 1,
    total: 1,
    status: "normal",
    icon: "btn_img4",
  },
  {
    type: "weatherRadar",
    name: "小型天气雷达",
    online: 1,
    total: 1,
    status: "normal",
    icon: "btn_img2",
  },
]);
</script>
<style scoped  lang="scss">
.panel-subtitle {
  background-image: url("@/assets/images/bg_panel_subtitle.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  //width: 100px;
  text-align: center;
  width:100px;
  font-family: 'AideepFont';
  font-weight: bold;
  font-size:14px
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
  height: 60px;
}
</style>