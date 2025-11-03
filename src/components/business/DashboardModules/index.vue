<template>
  <div>
    <!-- 感知分析模块 -->
    <div v-if="currentModule === MODULES.REGION_MONITOR">
      <div class="module-content">
        <div class="main-panel region-left-panel">
          <div class="panel-header">
            <span class="panel-title">区域监测</span>
          </div>
          <div class="panel-content">
            <region-moniter-list />
          </div>
        </div>

        <div class="main-panel region-right-panel" v-if="selectedRegion">
          <div class="panel-header">
            <span class="panel-title">{{ selectedRegion?.name }}详情</span>
          </div>
          <div class="panel-content">
            <region-detail :regionDetail="selectedRegionDetail" />
          </div>
        </div>
      </div>
    </div>

    <!-- 飞行分析模块 -->
    <div v-if="currentModule === MODULES.FLIGHT_ANALYSIS">
      <div class="main-panel weather-panel">
        <weather-element-selector 
          :model-value="currentElement" 
          @update:modelValue="emit('update:currentElement', $event)"
        />
      </div>
    </div>

    <!-- 设备监控模块 -->
    <div v-if="currentModule === MODULES.DEVICE_MONITOR">
      <device-monitor />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { MODULES } from "@/config/constants.js";
import RegionMoniterList from "../RegionMoniterList/index.vue";
import RegionDetail from "../RegionDetail/index.vue";
import WeatherElementSelector from "../WeatherElementSelector/index.vue";
import DeviceMonitor from "../DeviceMonitor/index.vue";
import { useRegionStore } from "@/store/modules/region";

const props = defineProps({
  currentModule: {
    type: String,
    required: true
  },
  currentElement: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:currentElement']);

const regionStore = useRegionStore();
const selectedRegion = computed(() => regionStore.selectedRegion);
const selectedRegionDetail = computed(() => regionStore.selectedRegionDetail);
</script>

<style scoped>
.module-content {
  display: flex;
  position: absolute;
  top: 100px;
  left: 10px;
  right: 10px;
  bottom: 10px;
}
</style>