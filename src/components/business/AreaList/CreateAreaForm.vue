<template>
  <form @submit.prevent="saveArea">
    <div class="form-row">
      <div class="form-item">
        <label class="form-label">名称 <span class="required">*</span></label>
        <input type="text" v-model="areaData.name" placeholder="请输入名称" class="form-input" required />
      </div>
      <div class="form-item">
        <label class="form-label">类型 <span class="required">*</span></label>
        <select v-model="areaData.type" class="form-select" required>
          <option value="takeoff">起降点</option>
          <option value="operation">作业点</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-item full-width">
        <label class="form-label">区域范围 <span class="required">*</span></label>
        <div class="bbox-info" v-if="areaData.bbox">
          <p>西：{{ areaData.bbox.west.toFixed(6) }}, 南：{{ areaData.bbox.south.toFixed(6) }}</p>
          <p>东：{{ areaData.bbox.east.toFixed(6) }}, 北：{{ areaData.bbox.north.toFixed(6) }}</p>
         
        </div>
        <div class="bbox-info" v-else>
          <p>请先在地图上绘制区域</p>
        </div>
         <button type="button" class="btn btn-small" @click="handleReselectClick">重新选择</button>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-default" @click="$emit('close')" :disabled="loading">取消</button>
      <button type="submit" class="btn btn-primary" :loading="loading">确认</button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { AreaService } from '@/services/areaService';

// 创建AreaService实例
const areaService = new AreaService();

// 组件状态
const areaData = ref({
  name: '',
  type: 'takeoff',
  bbox: null
});

// 加载状态
const loading = ref(false);

// 定义props和emit
const props = defineProps({
  reselectAreaCallback: {
    type: Function,
    default: null
  }
});

// 添加 emit
const emit = defineEmits(['area-created', 'close']);

// 显示表单并设置数据
const showCreateForm = (bbox) => {
  // 只更新bbox字段，保留已填写的名称和类型
  areaData.value.bbox = bbox;
};

// 处理重新选择按钮点击
const handleReselectClick = () => {
  if (props.reselectAreaCallback) {
    props.reselectAreaCallback();
  }
};

// 保存新区域
const saveArea = async () => {
  if (!areaData.value.name || !areaData.value.type || !areaData.value.bbox) {
    ElMessage.warning("请填写名称和类型");
    return;
  }

  loading.value = true;

  try {
      // 使用AreaService创建新区域
      // 创建成功后会自动调用列表接口更新前端store数据
      const newArea = await areaService.createArea(areaData.value);

    ElMessage.success("添加 【" + areaData.value.name + "】 重点关注区域成功！");

    // 触发事件
    emit('area-created', newArea);
    emit('close');
  } catch (error) {
    ElMessage.error("添加重点关注区域失败: " + error.message);
  } finally {
    loading.value = false;
  }
};

// 暴露方法给父组件
defineExpose({
  showCreateForm
});
</script>

<style scoped lang="scss">
/* 表单样式 */

/* 表单样式 */
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.form-item {
  flex: 1;
  min-width: 200px;

  &.full-width {
    flex: 100%;
    min-width: auto;
  }
}

.form-label {
  display: block;
  margin-bottom: 5px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
}

.btn-small {
  margin-top: 10px;
  padding: 4px 12px;
  font-size: 12px;
  background-color: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.6);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.form-input,
.form-select {
  width: 100%;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: white;
  font-size: 13px;
  transition: all 0.2s;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 32px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* 解决下拉选项文字颜色问题 */
  & option {
    background-color: rgba(17, 24, 39, 0.95);
    color: white;
    padding: 8px;
  }
}

.form-select {
  cursor: pointer;
}

.required {
  color: #ef4444;
}

/* 框选信息样式 */
.bbox-info {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  padding: 10px;
  font-size: 12px;
  color: #e2e8f0;

  p {
    margin: 5px 0;
  }
}

/* 按钮样式 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &.btn-primary {
    background-color: rgba(59, 130, 246, 0.9);
    border-color: #3b82f6;
    color: white;

    &:hover {
      background-color: rgba(59, 130, 246, 1);
    }
  }

  &.btn-default {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #e2e8f0;

    &:hover {
      background-color: rgba(255, 255, 255, 0.15);
    }
  }
}
</style>