<template>
  <!-- 通用阈值配置容器 -->
  <div class="common-threshold-container">
    <div class="threshold-card">
    

      <!-- 阈值配置表单 -->
      <form class="threshold-form" @submit.prevent="handleSave">
        <!-- 阈值参数区 -->
        <div class="form-section">
     
          <div class="form-grid">
            <!-- 风速阈值 -->
            <div class="form-item">
              <label>最大耐受风速(m/s) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.maxWindSpeed"
                placeholder="如：8"
                min="0"
                step="0.1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器安全飞行的最大持续风速</div>
            </div>

            <!-- 能见度阈值 -->
            <div class="form-item">
              <label>最小要求能见度(km) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.minVisibility"
                placeholder="如：4"
                min="0"
                step="0.1"
                required
                class="form-control"
              >
              <div class="form-hint">正常起降、巡航需满足的最低能见度</div>
            </div>

            <!-- 湍流等级阈值 -->
            <div class="form-item">
              <label>最大耐受湍流等级 <span class="required">*</span></label>
              <select 
                v-model="thresholdData.maxTurbulenceLevel"
                required
                class="form-control"
              >
                <option value="">选择等级</option>
                <option value="轻度">轻度</option>
                <option value="中度">中度</option>
                <option value="重度">重度</option>
              </select>
              <div class="form-hint">飞行器可承受的最大湍流强度</div>
            </div>

            <!-- 温度阈值 -->
            <div class="form-item">
              <label>最低耐受温度(℃)</label>
              <input
                type="number"
                v-model="thresholdData.minTemperature"
                placeholder="如：-15"
                step="1"
                class="form-control"
              >
              <div class="form-hint">电子设备、动力系统正常工作的最低温度</div>
            </div>

            <!-- 最高耐受温度(℃) -->
            <div class="form-item">
              <label>最高耐受温度(℃)</label>
              <input
                type="number"
                v-model="thresholdData.maxTemperature"
                placeholder="如：50"
                step="1"
                class="form-control"
              >
              <div class="form-hint">电子设备、动力系统正常工作的最高温度</div>
            </div>

            <!-- 降水阈值 -->
            <div class="form-item">
              <label>最大允许降水量(mm/h)</label>
              <input
                type="number"
                v-model="thresholdData.maxPrecipitation"
                placeholder="如：5"
                min="0"
                step="0.1"
                class="form-control"
              >
              <div class="form-hint">允许飞行的最大小时降水量</div>
            </div>
          </div>
        </div>

        <!-- 保存操作区 -->
        <div class="form-actions">
          <button type="submit" class="save-btn">保存配置</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 通用阈值数据
const thresholdData = ref({
  maxWindSpeed: 8,           // 最大耐受风速(m/s)
  minVisibility: 4,          // 最小要求能见度(km)
  maxTurbulenceLevel: '中度', // 最大耐受湍流等级
  minTemperature: -15,       // 最低耐受温度(℃)
  maxTemperature: 50,        // 最高耐受温度(℃)
  maxPrecipitation: 5        // 最大允许降水量(mm/h)
})

// 原始数据备份（用于重置）
const originalData = ref({})

// 组件挂载时备份初始数据
onMounted(() => {
  originalData.value = { ...thresholdData.value }
  // 实际项目中可在此处从后端获取当前配置：
  // fetchThresholdConfig()
})

// 保存配置
const handleSave = () => {
  // 模拟保存到后端
  console.log('保存通用阈值配置:', thresholdData.value)
  
  // 实际项目中替换为API请求
  // axios.post('/api/threshold/config', thresholdData.value)
  //   .then(res => {
  //     alert('配置保存成功！')
  //   })
  //   .catch(err => {
  //     alert('配置保存失败，请重试')
  //   })
  
  alert('通用阈值配置已保存！')
}

// 重置配置
const handleReset = () => {
  if (confirm('确定要重置为初始配置吗？')) {
    thresholdData.value = { ...originalData.value }
  }
}

// 从后端获取配置（示例函数）
const fetchThresholdConfig = () => {
  // 模拟API请求
  // axios.get('/api/threshold/config')
  //   .then(res => {
  //     thresholdData.value = res.data
  //     originalData.value = { ...res.data }
  //   })
}
</script>

<style scoped>
/* 基础变量定义 - 深蓝色科技风格 */
:root {
  --primary-color: #0f52ba; /* 深蓝主色 */
  --primary-light: #1e69de; /* 亮一点的蓝色 */
  --primary-dark: #0a3d8c; /* 深一点的蓝色 */
  --secondary-color: #3b82f6; /* 辅助蓝色 */
  --accent-color: #93c5fd; /* 强调色 */
  --bg-color: #f8fafc; /* 背景色 */
  --card-bg: #ffffff; /* 卡片背景 */
  --border-color: #dbeafe; /* 边框色 */
  --text-primary: #1e293b; /* 主要文本 */
  --text-secondary: #64748b; /* 次要文本 */
  --text-light: #f8fafc; /* 浅色文本 */
  --success-color: #10b981; /* 成功色 */
  --danger-color: #ef4444; /* 危险色 */
  --shadow-sm: 0 2px 5px rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
  --transition: all 0.3s ease;
}

/* 容器样式 */
.common-threshold-container {
  background-color: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 卡片样式 */
.threshold-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  overflow: hidden;
  transition: var(--transition);
}


/* 表单区块 */
.form-section {
  padding: 20px;
  background-color: var(--bg-color);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--accent-color);
}

/* 表单网格布局 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* 表单项 */
.form-item {
  display: flex;
  flex-direction: column;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.required {
  color: var(--danger-color);
  font-size: 14px;
}

/* 表单控件 */
.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: var(--transition);
  background-color: #ffffff;
}

.form-control:focus {
  outline: none;
  border-color: var(--secondary-color);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

/* 表单提示文字 */
.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 表单操作区 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-color);
}

/* 按钮样式 */
.reset-btn, .save-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}


.save-btn {
  background-color: #0f52ba;
  color: var(--text-light);
}

.save-btn:hover {
  background-color: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(15, 82, 186, 0.25);
}

.save-btn:active, .reset-btn:active {
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .common-threshold-container {
    padding: 10px;
  }
  
  .threshold-card {
    margin: 0;
  }
  
  .card-header {
    padding: 20px 24px;
  }
  
  .card-header h3 {
    font-size: 20px;
  }
  
  .threshold-form {
    padding: 20px;
  }
  
  .form-section {
    padding: 16px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .reset-btn, .save-btn {
    width: 100%;
    justify-content: center;
  }
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.threshold-card {
  animation: fadeInUp 0.4s ease-out forwards;
}

.form-section {
  animation: fadeInUp 0.4s ease-out 0.1s forwards;
  opacity: 0;
}

.form-actions {
  animation: fadeInUp 0.4s ease-out 0.2s forwards;
  opacity: 0;
}
</style>