<template>
  <!-- 阈值管理容器 -->
  <div class="threshold-management-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>阈值管理</h2>
      <button class="add-btn" @click="handleAddThreshold">添加阈值配置</button>
    </div>

    <!-- 阈值列表 -->
    <div class="threshold-list">
      <div class="list-header">
        <h3>阈值配置列表</h3>
        <div class="list-actions">
          <input 
            type="text" 
            v-model="searchAircraftId" 
            placeholder="输入飞行器ID搜索" 
            class="search-input"
          >
          <button class="search-btn" @click="handleSearchByAircraftId">搜索</button>
          <button class="default-btn" @click="handleGetDefaultThreshold">获取默认配置</button>
        </div>
      </div>
      
      <div class="list-content">
        <table class="threshold-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>飞行器ID</th>
              <th>最大风速(m/s)</th>
              <th>最大风切变(m/s)</th>
              <th>最小能见度(km)</th>
              <th>最大降水量(mm)</th>
              <th>最小云底高度(米)</th>
              <th>最低温度(℃)</th>
              <th>最高温度(℃)</th>
              <th>最大湿度(%)</th>
              <th>最大湍流等级</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="threshold in thresholds" :key="threshold.id">
              <td>{{ threshold.id }}</td>
              <td>{{ threshold.aircraftId || '默认' }}</td>
              <td>{{ threshold.maxWindSpeed }}</td>
              <td>{{ threshold.maxWindShear }}</td>
              <td>{{ threshold.minVisibility }}</td>
              <td>{{ threshold.maxPrecipitation }}</td>
              <td>{{ threshold.minCloudBase }}</td>
              <td>{{ threshold.tempMin }}</td>
              <td>{{ threshold.tempMax }}</td>
              <td>{{ threshold.maxHumidity }}</td>
              <td>{{ threshold.maxTurbulenceLevel }}</td>
              <td>
                <button class="edit-btn" @click="handleEditThreshold(threshold)">编辑</button>
                <button class="delete-btn" @click="handleDeleteThreshold(threshold.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="thresholds.length === 0" class="empty-state">
          <p>暂无阈值配置</p>
        </div>
      </div>
    </div>

    <!-- 阈值配置表单 -->
    <div class="threshold-form-card" v-if="showForm">
      <div class="form-header">
        <h3>{{ isEditing ? '编辑阈值配置' : '添加阈值配置' }}</h3>
        <button class="close-btn" @click="showForm = false">&times;</button>
      </div>
      
      <form class="threshold-form" @submit.prevent="handleSave">
        <!-- 阈值参数区 -->
        <div class="form-section">
          <div class="form-grid">
            <!-- 飞行器ID -->
            <div class="form-item">
              <label>飞行器ID</label>
              <input
                type="text"
                v-model="thresholdData.aircraftId"
                placeholder="如：AC1001"
                class="form-control"
              >
              <div class="form-hint">留空表示默认配置</div>
            </div>

            <!-- 风速阈值 -->
            <div class="form-item">
              <label>最大风速(m/s) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.maxWindSpeed"
                placeholder="如：8"
                min="0"
                step="0.1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能承受的最大风速</div>
            </div>

            <!-- 风切变阈值 -->
            <div class="form-item">
              <label>最大风切变(m/s) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.maxWindShear"
                placeholder="如：5"
                min="0"
                step="0.1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能承受的最大风切变</div>
            </div>

            <!-- 能见度阈值 -->
            <div class="form-item">
              <label>最小能见度(km) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.minVisibility"
                placeholder="如：4"
                min="0"
                step="0.1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能安全飞行的最小能见度</div>
            </div>

            <!-- 降水量阈值 -->
            <div class="form-item">
              <label>最大降水量(mm) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.maxPrecipitation"
                placeholder="如：5"
                min="0"
                step="0.1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能承受的最大降水量</div>
            </div>

            <!-- 云底高度阈值 -->
            <div class="form-item">
              <label>最小云底高度(米) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.minCloudBase"
                placeholder="如：100"
                min="0"
                step="1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能安全飞行的最小云底高度</div>
            </div>

            <!-- 最低温度阈值 -->
            <div class="form-item">
              <label>最低温度(℃) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.tempMin"
                placeholder="如：-15"
                step="1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能正常运行的最低温度</div>
            </div>

            <!-- 最高温度阈值 -->
            <div class="form-item">
              <label>最高温度(℃) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.tempMax"
                placeholder="如：50"
                step="1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能正常运行的最高温度</div>
            </div>

            <!-- 湿度阈值 -->
            <div class="form-item">
              <label>最大湿度(%) <span class="required">*</span></label>
              <input
                type="number"
                v-model="thresholdData.maxHumidity"
                placeholder="如：90"
                min="0"
                max="100"
                step="1"
                required
                class="form-control"
              >
              <div class="form-hint">飞行器能承受的最大湿度</div>
            </div>

            <!-- 湍流等级阈值 -->
            <div class="form-item">
              <label>最大湍流等级 <span class="required">*</span></label>
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
              <div class="form-hint">飞行器能承受的最大湍流等级</div>
            </div>
          </div>
        </div>

        <!-- 保存操作区 -->
        <div class="form-actions">
          <button type="button" class="reset-btn" @click="handleReset">重置</button>
          <button type="submit" class="save-btn">保存配置</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useThresholdsStore } from '@/store/modules/thresholds'

// 阈值管理Store
const thresholdsStore = useThresholdsStore()

// 搜索飞行器ID
const searchAircraftId = ref('')
// 显示表单
const showForm = ref(false)
// 是否编辑模式
const isEditing = ref(false)
// 阈值数据
const thresholdData = ref({
  id: null,
  aircraftId: '',
  maxWindSpeed: 8,
  maxWindShear: 5,
  minVisibility: 4,
  maxPrecipitation: 5,
  minCloudBase: 100,
  tempMin: -15,
  tempMax: 50,
  maxHumidity: 90,
  maxTurbulenceLevel: '中度'
})

// 原始数据备份（用于重置）
const originalData = ref({})

// 从Store获取阈值列表
const thresholds = computed(() => thresholdsStore.thresholdList)
// 加载状态
const loading = computed(() => thresholdsStore.loading)

// 组件挂载时初始化阈值数据
onMounted(async () => {
  await thresholdsStore.initializeThresholds()
})

// 按飞行器ID搜索阈值配置
const handleSearchByAircraftId = async () => {
  if (!searchAircraftId.value) {
    await thresholdsStore.fetchAllThresholds()
    return
  }
  
  try {
    await thresholdsStore.fetchThresholdByAircraftId(searchAircraftId.value)
  } catch (error) {
    console.error('搜索阈值配置失败:', error)
    alert('搜索阈值配置失败，请重试')
  }
}

// 获取默认阈值配置
const handleGetDefaultThreshold = async () => {
  try {
    await thresholdsStore.fetchDefaultThreshold()
  } catch (error) {
    console.error('获取默认阈值配置失败:', error)
    alert('获取默认阈值配置失败，请重试')
  }
}

// 显示添加阈值配置表单
const handleAddThreshold = () => {
  isEditing.value = false
  thresholdData.value = {
    id: null,
    aircraftId: '',
    maxWindSpeed: 8,
    maxWindShear: 5,
    minVisibility: 4,
    maxPrecipitation: 5,
    minCloudBase: 100,
    tempMin: -15,
    tempMax: 50,
    maxHumidity: 90,
    maxTurbulenceLevel: '中度'
  }
  originalData.value = { ...thresholdData.value }
  showForm.value = true
}

// 显示编辑阈值配置表单
const handleEditThreshold = (threshold) => {
  isEditing.value = true
  thresholdData.value = { ...threshold }
  originalData.value = { ...threshold }
  showForm.value = true
}

// 保存配置
const handleSave = async () => {
  try {
    if (isEditing.value) {
      await thresholdsStore.updateThreshold(thresholdData.value)
      alert('阈值配置更新成功！')
    } else {
      await thresholdsStore.addThreshold(thresholdData.value)
      alert('阈值配置添加成功！')
    }
    showForm.value = false
  } catch (error) {
    console.error('保存阈值配置失败:', error)
    alert('保存阈值配置失败，请重试')
  }
}

// 重置配置
const handleReset = () => {
  thresholdData.value = { ...originalData.value }
}

// 删除阈值配置
const handleDeleteThreshold = async (id) => {
  if (confirm('确定要删除该阈值配置吗？')) {
    try {
      await thresholdsStore.deleteThreshold(id)
      alert('阈值配置删除成功！')
    } catch (error) {
      console.error('删除阈值配置失败:', error)
      alert('删除阈值配置失败，请重试')
    }
  }
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
.threshold-management-container {
  background-color: var(--bg-color);
  padding: 20px;
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.add-btn {
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: var(--text-light);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.add-btn:hover {
  background-color: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 82, 186, 0.2);
}

/* 阈值列表 */
.threshold-list {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
  overflow: hidden;
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.list-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  width: 200px;
}

.search-btn, .default-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
  background-color: var(--card-bg);
  color: var(--text-primary);
}

.search-btn:hover, .default-btn:hover {
  border-color: var(--secondary-color);
  background-color: rgba(59, 130, 246, 0.05);
}

/* 列表内容 */
.list-content {
  padding: 20px;
  overflow-x: auto;
}

.threshold-table {
  width: 100%;
  border-collapse: collapse;
}

.threshold-table th, .threshold-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.threshold-table th {
  background-color: var(--bg-color);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  white-space: nowrap;
}

.threshold-table td {
  font-size: 14px;
  color: var(--text-secondary);
}

.threshold-table tr:hover {
  background-color: rgba(59, 130, 246, 0.05);
}

/* 操作按钮 */
.edit-btn, .delete-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
  margin-right: 8px;
}

.edit-btn {
  background-color: var(--secondary-color);
  color: var(--text-light);
}

.edit-btn:hover {
  background-color: var(--primary-light);
  transform: translateY(-1px);
}

.delete-btn {
  background-color: var(--danger-color);
  color: var(--text-light);
}

.delete-btn:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 16px;
}

/* 表单卡片 */
.threshold-form-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  margin-top: 24px;
}

.form-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-color);
}

.form-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: var(--transition);
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

/* 表单区块 */
.form-section {
  padding: 24px;
  background-color: var(--bg-color);
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
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
  background-color: var(--card-bg);
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

.reset-btn {
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.reset-btn:hover {
  border-color: var(--secondary-color);
  background-color: rgba(59, 130, 246, 0.05);
}

.save-btn {
  background-color: var(--primary-color);
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
  .threshold-management-container {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .list-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-input {
    width: 100%;
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
  
  .threshold-table {
    font-size: 12px;
  }
  
  .threshold-table th, .threshold-table td {
    padding: 8px 12px;
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

.threshold-list, .threshold-form-card {
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