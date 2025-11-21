<template>
  <div class="monitoring-points-management">
    <div class="page-header">
      <h1>监测点管理</h1>
      <p>管理系统中的气象监测点</p>
    </div>
    
    <div class="content-wrapper">
      <div class="control-bar">
        <button class="btn btn-primary" @click="showAddDialog = true">
          <span class="btn-icon">+</span> 添加监测点
        </button>
      </div>
      
      <div class="data-table">
        <table class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>编号</th>
              <th>位置</th>
              <th>经度</th>
              <th>纬度</th>
              <th>海拔(m)</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in monitorPoints" :key="point.id">
              <td>{{ point.name }}</td>
              <td>{{ point.code }}</td>
              <td>{{ point.location }}</td>
              <td>{{ point.longitude }}</td>
              <td>{{ point.latitude }}</td>
              <td>{{ point.altitude }}</td>
              <td>
                <span :class="['status-tag', getStatusClass(point.status)]">
                  {{ point.status }}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-link" @click="editMonitorPoint(point)">
                    编辑
                  </button>
                  <button class="btn btn-link btn-danger" @click="deleteMonitorPoint(point)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="monitorPoints.length === 0">
              <td colspan="8" class="empty-row">
                暂无监测点数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 监测点编辑对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑监测点' : '添加监测点' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveMonitorPoint">
            <div class="form-row">
              <div class="form-item">
                <label class="form-label">监测点名称 <span class="required">*</span></label>
                <input 
                  type="text" 
                  v-model="currentPoint.name" 
                  placeholder="请输入名称" 
                  class="form-input"
                  required
                />
              </div>
              <div class="form-item">
                <label class="form-label">监测点编号 <span class="required">*</span></label>
                <input 
                  type="text" 
                  v-model="currentPoint.code" 
                  placeholder="请输入编号" 
                  class="form-input"
                  required
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label class="form-label">位置描述</label>
                <input 
                  type="text" 
                  v-model="currentPoint.location" 
                  placeholder="请输入位置描述" 
                  class="form-input"
                />
              </div>
              <div class="form-item">
                <label class="form-label">状态</label>
                <select v-model="currentPoint.status" class="form-select">
                  <option value="正常">正常</option>
                  <option value="维护中">维护中</option>
                  <option value="故障">故障</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label class="form-label">经度 <span class="required">*</span></label>
                <input 
                  type="number" 
                  v-model.number="currentPoint.longitude" 
                  :min="0" 
                  :max="180" 
                  :step="0.000001" 
                  class="form-input"
                  required
                />
              </div>
              <div class="form-item">
                <label class="form-label">纬度 <span class="required">*</span></label>
                <input 
                  type="number" 
                  v-model.number="currentPoint.latitude" 
                  :min="0" 
                  :max="90" 
                  :step="0.000001" 
                  class="form-input"
                  required
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label class="form-label">海拔(m)</label>
                <input 
                  type="number" 
                  v-model.number="currentPoint.altitude" 
                  :min="0" 
                  :max="10000" 
                  :step="1" 
                  class="form-input"
                />
              </div>
            </div>
          </form>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveMonitorPoint">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useMonitoringPointStore } from '@/store/modules/monitoringPoints'

// 状态管理
const monitoringPointStore = useMonitoringPointStore()

// 监测点数据
const monitorPoints = computed(() => monitoringPointStore.pointsList)

// 对话框状态
const showDialog = ref(false)
const isEditMode = ref(false)
const currentPoint = reactive({
  id: '',
  name: '',
  code: '',
  location: '',
  longitude: 0,
  latitude: 0,
  altitude: 0,
  status: '正常'
})

// 初始化数据
onMounted(() => {
  // 确保有模拟数据
  if (monitorPoints.value.length === 0) {
    const mockData = [
      {
        id: 'point-1',
        name: '北京市气象局',
        code: 'BJ-QXJ-001',
        location: '北京市海淀区中关村南大街46号',
        longitude: 116.3345,
        latitude: 39.9572,
        altitude: 45,
        status: '正常'
      },
      {
        id: 'point-2',
        name: '上海浦东气象站',
        code: 'SH-PD-002',
        location: '上海市浦东新区张江高科技园区',
        longitude: 121.5091,
        latitude: 31.2242,
        altitude: 12,
        status: '正常'
      },
      {
        id: 'point-3',
        name: '广州塔气象站',
        code: 'GZ-TW-003',
        location: '广州市海珠区阅江西路222号',
        longitude: 113.3341,
        latitude: 23.1152,
        altitude: 450,
        status: '维护中'
      }
    ]
    monitoringPointStore.setPointsList(mockData)
  }
})

// 打开添加对话框
const showAddDialog = computed({
  get: () => false,
  set: (value) => {
    if (value) {
      isEditMode.value = false
      // 重置表单
      currentPoint.id = ''
      currentPoint.name = ''
      currentPoint.code = ''
      currentPoint.location = ''
      currentPoint.longitude = 0
      currentPoint.latitude = 0
      currentPoint.altitude = 0
      currentPoint.status = '正常'
      showDialog.value = true
    }
  }
})

// 编辑监测点
const editMonitorPoint = (point) => {
  Object.assign(currentPoint, { ...point })
  isEditMode.value = true
  showDialog.value = true
}

// 关闭对话框
const closeDialog = () => {
  showDialog.value = false
}

// 删除监测点
const deleteMonitorPoint = (point) => {
  if (confirm(`确定要删除监测点「${point.name}」吗？`)) {
    const updatedList = monitoringPointStore.pointsList.filter(p => p.id !== point.id)
    monitoringPointStore.setPointsList(updatedList)
    alert('删除成功')
  }
}

// 保存监测点
const saveMonitorPoint = () => {
  // 简单验证
  if (!currentPoint.name || !currentPoint.code || !currentPoint.longitude || !currentPoint.latitude) {
    alert('请填写必填项')
    return
  }
  
  try {
    if (isEditMode.value) {
      // 编辑模式
      const updatedList = monitoringPointStore.pointsList.map(point => 
        point.id === currentPoint.id ? { ...currentPoint } : point
      )
      monitoringPointStore.setPointsList(updatedList)
      alert('更新成功')
    } else {
      // 添加模式
      const newPoint = {
        ...currentPoint,
        id: `point-${Date.now()}`,
      }
      monitoringPointStore.setPointsList([...monitoringPointStore.pointsList, newPoint])
      alert('添加成功')
    }
    
    showDialog.value = false
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  }
}

// 获取状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case '正常': return 'status-success'
    case '维护中': return 'status-warning'
    case '故障': return 'status-danger'
    default: return 'status-info'
  }
}
</script>

<style scoped lang="scss">
// 变量定义
$primary-color: #1890ff;
$border-color: #d9d9d9;
$text-color: #333;
$bg-color: #f5f5f5;
$white: #ffffff;
$success-color: #52c41a;
$warning-color: #faad14;
$danger-color: #f5222d;
$shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

.monitoring-points-management {
  width: 100%;
  min-height: 100%;
  background-color: $bg-color;
  padding: 20px;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 30px;
  
  h1 {
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: 500;
    color: $text-color;
  }
  
  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.control-bar {
  margin-bottom: 24px;
  text-align: right;
}

.btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid $border-color;
  
  &:hover {
    opacity: 0.85;
  }
  
  &:active {
    opacity: 1;
    transform: translateY(1px);
  }
}

.btn-primary {
  background-color: $primary-color;
  border-color: $primary-color;
  color: $white;
  
  &:hover {
    background-color: #40a9ff;
    border-color: #40a9ff;
  }
}

.btn-default {
  background-color: $white;
  color: $text-color;
  
  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }
}

.btn-link {
  background: none;
  border: none;
  padding: 4px 8px;
  color: $primary-color;
  height: auto;
  
  &:hover {
    color: #40a9ff;
    opacity: 1;
  }
  
  &.btn-danger {
    color: $danger-color;
    
    &:hover {
      color: #ff4d4f;
    }
  }
}

.btn-icon {
  margin-right: 4px;
  font-weight: bold;
}

.data-table {
  background-color: $white;
  border-radius: 6px;
  box-shadow: $shadow;
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
  
  th,
  td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid $border-color;
  }
  
  th {
    background-color: #fafafa;
    font-weight: 500;
    color: $text-color;
    font-size: 14px;
  }
  
  td {
    color: #666;
    font-size: 14px;
  }
  
  tr:hover {
    background-color: #f5f5f5;
  }
}

.empty-row {
  text-align: center;
  color: #999;
  padding: 40px 0 !important;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  color: $success-color;
}

.status-warning {
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  color: $warning-color;
}

.status-danger {
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  color: $danger-color;
}

.status-info {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  color: $primary-color;
}

.table-actions {
  display: flex;
  gap: 8px;
}

// 对话框样式
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background-color: $white;
  border-radius: 6px;
  box-shadow: $shadow;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid $border-color;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: $text-color;
  }
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background-color: #f5f5f5;
    color: $text-color;
  }
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid $border-color;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background-color: #fafafa;
}

// 表单样式
.form-row {
  display: flex;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-item {
  flex: 1;
  margin-right: 24px;
  
  &:last-child {
    margin-right: 0;
  }
  
  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 16px;
  }
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: $text-color;
  font-size: 14px;
}

.required {
  color: $danger-color;
}

.form-input,
.form-select {
  width: 100%;
  height: 32px;
  padding: 4px 11px;
  border: 1px solid $border-color;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s;
  
  &:focus {
    border-color: $primary-color;
    outline: none;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
  
  &:hover {
    border-color: $primary-color;
  }
}

.form-select {
  cursor: pointer;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
}
// 响应式设计
@media (max-width: 768px) {
  .monitoring-points-management {
    padding: 10px;
  }
  
  .page-header h1 {
    font-size: 24px;
  }
  
  .control-bar {
    margin-bottom: 16px;
    text-align: center;
  }
  
  .data-table {
    overflow-x: auto;
    border-radius: 4px;
  }
  
  .table {
    min-width: 640px;
    
    th,
    td {
      padding: 8px 12px;
      font-size: 13px;
    }
  }
  
  .dialog {
    width: 95%;
    max-width: none;
    max-height: 95vh;
  }
  
  .dialog-header,
  .dialog-body {
    padding: 16px;
  }
  
  .form-row {
    flex-direction: column;
    
    .form-item {
      margin-right: 0;
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  .dialog-footer {
    padding: 12px 16px;
    flex-direction: column-reverse;
    
    .btn {
      width: 100%;
    }
  }
  
  .table-actions {
    flex-direction: column;
    gap: 4px;
    
    .btn {
      padding: 2px 6px;
      font-size: 12px;
    }
  }
  
  .empty-row {
    padding: 20px 0 !important;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .monitoring-points-management {
    padding: 15px;
  }
  
  .content-wrapper {
    max-width: 100%;
  }
  
  .table {
    th,
    td {
      padding: 10px 14px;
      font-size: 14px;
    }
  }
  
  .dialog {
    width: 500px;
  }
}

// 平板设备横屏模式
@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
  .data-table {
    overflow-x: auto;
  }
  
  .table {
    min-width: 768px;
  }
}

// 打印样式
@media print {
  .monitoring-points-management {
    padding: 0;
  }
  
  .control-bar {
    display: none;
  }
  
  .table {
    th,
    td {
      border-bottom: 1px solid #ddd;
    }
    
    .table-actions {
      display: none;
    }
  }
  
  .dialog-overlay {
    display: none !important;
  }
}
</style>