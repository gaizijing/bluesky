<template>
  <div class="threshold-panel">
    <!-- 面板标题栏 -->
   

    <!-- 阈值内容区 -->
    <div class="threshold-content">
      <!-- 分组展示阈值 -->
      <div 
        v-for="(group, groupKey) in thresholdGroups" 
        :key="groupKey"
        class="threshold-group"
      >
        <div class="group-header">
          <i :class="group.groupConfig.icon" class="group-icon"></i>
          <h4 class="group-title">{{ group.groupConfig.label }}</h4>
          <div class="group-desc">{{ group.groupConfig.description }}</div>
        </div>

        <div class="threshold-list">
          <div 
            v-for="item in group.items" 
            :key="item.key"
            class="threshold-item"
          >
            <div class="item-info">
              <div class="item-name">{{ item.label }}</div>
              <div class="item-desc">{{ item.description }}</div>
            </div>
            
            <div class="item-control">
              <div class="value-input-group">
                <input
                  type="number"
                  v-model.number="item.currentValue"
                  :min="item.min"
                  :max="item.max"
                  :step="item.step || 0.1"
                  class="value-input"
                  @input="handleValueChange(item)"
                  @blur="validateValue(item)"
                >
                <span class="value-unit">{{ item.unit }}</span>
              </div>
              
              <div class="value-range">
                <span>范围: {{ item.min }} - {{ item.max }}{{ item.unit }}</span>
              </div>
              
              <!-- 状态提示 -->
              <div 
                v-if="item.error" 
                class="error-tip"
              >
                <i class="el-icon-warning"></i>
                <span>超出范围</span>
              </div>
              <div 
                v-if="item.isChanged && !item.error" 
                class="changed-tip"
              >
                <i class="el-icon-edit"></i>
                <span>已修改</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
     <div class="footer">
            <button 
          class="reset-btn" 
          @click="resetAll" 
          :disabled="isSaving"
        >
          <i class="el-icon-refresh"></i>
          <span>重置</span>
        </button>
        <button 
          class="save-btn" 
          @click="saveThresholds" 
          :disabled="isSaving || !hasChanges"
        >
          <i v-if="!isSaving" class="el-icon-check"></i>
          <i v-else class="el-icon-loading"></i>
          <span>保存设置</span>
        </button>
        </div>
     
    <!-- 操作反馈提示 -->
    <div 
      v-if="showToast"
      class="operation-toast"
      :class="toastType"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

// 初始阈值数据（新增适飞条件分组）
const initialThresholds = ref([
  {
    groupKey: "risk",
    groupConfig: {
      label: "综合风险阈值",
      icon: "el-icon-shield",
      description: "控制综合风险等级判定标准"
    },
    items: [
      {
        key: "lowRiskMax",
        label: "低风险最大值",
        description: "低于此值判定为低风险",
        unit: "",
        min: 0.1,
        max: 0.5,
        step: 0.05,
        originalValue: 0.3,
        currentValue: 0.3,
        error: false,
        isChanged: false
      },
      {
        key: "highRiskMin",
        label: "高风险最小值",
        description: "高于此值判定为高风险",
        unit: "",
        min: 0.5,
        max: 0.9,
        step: 0.05,
        originalValue: 0.7,
        currentValue: 0.7,
        error: false,
        isChanged: false
      }
    ]
  },
  // 新增：适飞条件阈值分组
  {
    groupKey: "flightSuitability",
    groupConfig: {
      label: "适飞条件阈值",
      icon: "el-icon-check-circle",
      description: "判定飞行是否适航的关键参数标准"
    },
    items: [
      {
        key: "minVisibility",
        label: "最低能见度",
        description: "低于此能见度禁止飞行",
        unit: "km",
        min: 1,
        max: 10,
        step: 0.5,
        originalValue: 3,
        currentValue: 3,
        error: false,
        isChanged: false
      },
      {
        key: "minCloudHeight",
        label: "最低云高",
        description: "低于此云高禁止飞行",
        unit: "m",
        min: 50,
        max: 500,
        step: 10,
        originalValue: 100,
        currentValue: 100,
        error: false,
        isChanged: false
      },
      {
        key: "minTemperature",
        label: "最低允许温度",
        description: "低于此温度禁止飞行",
        unit: "℃",
        min: -10,
        max: 10,
        step: 1,
        originalValue: -5,
        currentValue: -5,
        error: false,
        isChanged: false
      },
      {
        key: "maxTemperature",
        label: "最高允许温度",
        description: "高于此温度禁止飞行",
        unit: "℃",
        min: 25,
        max: 40,
        step: 1,
        originalValue: 35,
        currentValue: 35,
        error: false,
        isChanged: false
      },
      {
        key: "maxHumidity",
        label: "最大允许湿度",
        description: "高于此湿度禁止飞行",
        unit: "%",
        min: 70,
        max: 95,
        step: 1,
        originalValue: 85,
        currentValue: 85,
        error: false,
        isChanged: false
      },
      {
        key: "minBatteryVoltage",
        label: "最低电池电压",
        description: "低于此电压禁止起飞",
        unit: "V",
        min: 22,
        max: 25,
        step: 0.1,
        originalValue: 23.5,
        currentValue: 23.5,
        error: false,
        isChanged: false
      },
      {
        key: "minSignalStrength",
        label: "最小信号强度",
        description: "低于此强度禁止飞行（数值越大信号越强）",
        unit: "dBm",
        min: -80,  // -80dBm 信号较弱，-50dBm 信号较强
        max: -50,
        step: 1,
        originalValue: -70,
        currentValue: -70,
        error: false,
        isChanged: false
      }
    ]
  },
  {
    groupKey: "weather",
    groupConfig: {
      label: "气象参数阈值",
      icon: "el-icon-cloud",
      description: "各类气象指标的风险判定标准"
    },
    items: [
      {
        key: "maxWindSpeed",
        label: "最大安全风速",
        description: "超出此风速触发预警",
        unit: "m/s",
        min: 8,
        max: 20,
        step: 1,
        originalValue: 12,
        currentValue: 12,
        error: false,
        isChanged: false
      },
      {
        key: "maxTurbulence",
        label: "最大安全湍流",
        description: "超出此湍流等级触发预警",
        unit: "级",
        min: 3,
        max: 8,
        step: 0.5,
        originalValue: 5,
        currentValue: 5,
        error: false,
        isChanged: false
      },
      {
        key: "maxRainfall",
        label: "最大安全降水量",
        description: "超出此降水量触发预警",
        unit: "mm/h",
        min: 2,
        max: 10,
        step: 0.5,
        originalValue: 4,
        currentValue: 4,
        error: false,
        isChanged: false
      }
    ]
  },
  {
    groupKey: "system",
    groupConfig: {
      label: "系统参数阈值",
      icon: "el-icon-setting",
      description: "设备与系统运行的阈值设置"
    },
    items: [
      {
        key: "refreshInterval",
        label: "数据刷新间隔",
        description: "实时数据刷新频率",
        unit: "s",
        min: 5,
        max: 60,
        step: 5,
        originalValue: 10,
        currentValue: 10,
        error: false,
        isChanged: false
      },
      {
        key: "warningDuration",
        label: "预警显示时长",
        description: "预警信息自动消失时间",
        unit: "s",
        min: 5,
        max: 30,
        step: 5,
        originalValue: 15,
        currentValue: 15,
        error: false,
        isChanged: false
      }
    ]
  }
]);

// 响应式阈值数据
const thresholdGroups = ref([...initialThresholds.value]);

// 状态管理（保持不变）
const isSaving = ref(false);
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref("success");

// 检查是否有修改（保持不变）
const hasChanges = computed(() => {
  return thresholdGroups.value.some(group => 
    group.items.some(item => item.isChanged)
  );
});

// 处理值变化（保持不变）
const handleValueChange = (item) => {
  item.isChanged = item.currentValue !== item.originalValue;
  validateValue(item);
};

// 验证值是否在范围内（保持不变）
const validateValue = (item) => {
  if (item.currentValue < item.min || item.currentValue > item.max) {
    item.error = true;
    return false;
  }
  item.error = false;
  return true;
};

// 保存阈值设置（保持不变）
const saveThresholds = async () => {
  let isValid = true;
  thresholdGroups.value.forEach(group => {
    group.items.forEach(item => {
      if (!validateValue(item)) isValid = false;
    });
  });

  if (!isValid) {
    showToastMessage("存在无效值，请检查后重试", "error");
    return;
  }

  isSaving.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    thresholdGroups.value.forEach(group => {
      group.items.forEach(item => {
        if (item.isChanged) {
          item.originalValue = item.currentValue;
          item.isChanged = false;
        }
      });
    });
    
    showToastMessage("阈值设置保存成功", "success");
  } catch (error) {
    console.error("保存失败:", error);
    showToastMessage("保存失败，请稍后重试", "error");
  } finally {
    isSaving.value = false;
  }
};

// 重置所有修改（保持不变）
const resetAll = () => {
  thresholdGroups.value.forEach(group => {
    group.items.forEach(item => {
      item.currentValue = item.originalValue;
      item.error = false;
      item.isChanged = false;
    });
  });
  showToastMessage("已重置为原始值", "info");
};

// 显示操作提示（保持不变）
const showToastMessage = (message, type = "success") => {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    showToast.value = false;
  }, 3000);
};
</script>

<style scoped lang="scss">
/* 样式保持不变，与之前完全一致 */

.threshold-panel {
  width: 100%;
  color: #e2e8f0;
  overflow: hidden;

 
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(15, 23, 51, 0.8);
  
  .panel-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
    display: flex;
    align-items: center;
    
    &::before {
      content: "";
      width: 4px;
      height: 18px;
      background-color: #3b82f6;
      border-radius: 2px;
      margin-right: 8px;
    }
  }
  
  .header-actions {
    display: flex;
    gap: 10px;
  }
}

.reset-btn, .save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  i {
    font-size: 14px;
  }
}

.reset-btn {
  background-color: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.save-btn {
  background-color: #3b82f6;
  color: #ffffff;
  
  &:hover {
    background-color: #2563eb;
  }
  
  &:disabled {
    background-color: #3b82f680;
    cursor: not-allowed;
  }
}

.threshold-content {
  max-height: 350px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(59, 130, 246, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.threshold-group {
  margin-bottom: 25px;
  border-radius: 6px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.03);
  
  &:last-child {
    margin-bottom: 0;
  }
}

.group-header {
  padding: 8px;
  background-color: rgba(59, 130, 246, 0.08);
  border-left: 3px solid #3b82f6;
  
  .group-icon {
    color: #3b82f6;
    margin-right: 8px;
    font-size: 16px;
  }
  
  .group-title {
    display: inline-block;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
    vertical-align: middle;
  }
  
  .group-desc {
    margin: 5px 0 0 24px;
    font-size: 12px;
    color: #94a3b8;
  }
}

.threshold-list {
  padding: 10px 0;
}

.threshold-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }
}

.item-info {
  flex: 1;
  
  .item-name {
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    margin-bottom: 3px;
  }
  
  .item-desc {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.3;
  }
}

.item-control {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  min-width: 200px;
}

.value-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.value-input {
  width: 120px;
  padding: 6px 10px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 14px;
  text-align: right;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
}

.value-unit {
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
}

.value-range {
  font-size: 12px;
  color: #64748b;
}

.error-tip, .changed-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
  animation: fadeIn 0.3s ease;
}

.error-tip {
  color: #f87171;
  background-color: rgba(239, 68, 68, 0.1);
  
  i {
    font-size: 12px;
  }
}

.changed-tip {
  color: #60a5fa;
  background-color: rgba(59, 130, 246, 0.1);
  
  i {
    font-size: 12px;
  }
}

.operation-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  color: #ffffff;
  z-index: 1000;
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
}

.operation-toast.success {
  background-color: rgba(16, 185, 129, 0.9);
}

.operation-toast.error {
  background-color: rgba(239, 68, 68, 0.9);
}

.operation-toast.info {
  background-color: rgba(59, 130, 246, 0.9);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Footer样式 */
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 20px;
}

/* 重置按钮样式 */
.reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

.reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 保存按钮样式 */
.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background-color: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 768px) {
  .threshold-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .item-control {
    width: 100%;
    align-items: flex-start;
  }
  
  .value-input-group {
    width: 100%;
    max-width: 200px;
  }
}
</style>