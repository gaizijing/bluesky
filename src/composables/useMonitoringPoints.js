// src/composables/useMonitoringPoints.js
import { ref, computed } from 'vue'
import { useMonitoringPointStore } from '@/store/modules/monitoringPoints'
import { fetchMonitoringPoints } from '@/api/monitoringPoints'

// 初始化状态管理
const isInitializing = ref(false)
const isInitialized = ref(false)
const initializationError = ref(null)

export function useMonitoringPoints() {
  const monitoringPointStore = useMonitoringPointStore()
  
  // 初始化监测点数据
  const initialize = async () => {
    // 如果已经初始化或正在初始化，直接返回
    if (isInitialized.value || isInitializing.value) {
      return;
    }

    isInitializing.value = true;
    initializationError.value = null;

    try {
      // 从API获取监测点数据
      const pointsData = await fetchMonitoringPoints();
      
      // 保存到store
      monitoringPointStore.setPointsList(pointsData);
      
      isInitialized.value = true;
    } catch (error) {
      initializationError.value = error;
      console.error("初始化监测点数据失败:", error);
    } finally {
      isInitializing.value = false;
    }
  };

  // 强制重新初始化
  const reinitialize = async () => {
    isInitialized.value = false;
    await initialize();
  };

  return {
    // 状态
    isInitializing: computed(() => isInitializing.value),
    isInitialized: computed(() => isInitialized.value),
    initializationError: computed(() => initializationError.value),
    
    // 方法
    initialize,
    reinitialize,
    
    // Store相关
    monitoringPointStore
  }
}