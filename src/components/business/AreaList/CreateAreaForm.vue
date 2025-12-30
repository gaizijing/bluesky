<template>
  <div v-if="showForm" class="dialog-mask" @click="closeForm">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <h3>新建重点关注区域</h3>
        <button class="dialog-close" @click="closeForm">×</button>
      </div>
      <div class="dialog-content">
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
              <div class="bbox-info">
                <p>已选择范围：</p>
                <p>西：{{ areaData.bbox.west.toFixed(6) }}, 南：{{ areaData.bbox.south.toFixed(6) }}</p>
                <p>东：{{ areaData.bbox.east.toFixed(6) }}, 北：{{ areaData.bbox.north.toFixed(6) }}</p>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-default" @click="closeForm">取消</button>
            <button type="submit" class="btn btn-primary">确认</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAreaStore } from '@/store/modules/area';
import { ElMessage } from 'element-plus';

// 状态管理
const areaStore = useAreaStore();

// 组件状态
const showForm = ref(false);
const areaData = ref({
  name: '',
  type: 'takeoff',
  bbox: null
});

// 添加 emit
const emit = defineEmits(['area-created', 'form-closed']);

// 监听showForm变化
watch(showForm, (newVal) => {
  if (!newVal) {
    // 表单关闭时触发事件
    emit('form-closed');
  }
});

// 显示表单并设置数据
const showCreateForm = (bbox) => {
  areaData.value = {
    name: '',
    type: 'takeoff',
    bbox: bbox
  };
  showForm.value = true;
};

// 关闭表单
const closeForm = () => {
  showForm.value = false;
};

// 保存新区域
const saveArea = () => {
  if (!areaData.value.name || !areaData.value.type || !areaData.value.bbox) {
    ElMessage.warning("请填写名称和类型");
    return;
  }

  // 创建新的重点关注区域对象
  const newArea = {
    id: `area-${Date.now()}`,
    name: areaData.value.name,
    type: areaData.value.type,
    location: `${areaData.value.bbox.west.toFixed(2)}, ${areaData.value.bbox.south.toFixed(2)}`,
    coordinates: [
      (areaData.value.bbox.west + areaData.value.bbox.east) / 2,
      (areaData.value.bbox.south + areaData.value.bbox.north) / 2
    ],
    status: "available",
    warningReason: "",
    lastUpdate: Date.now(),
    bbox: areaData.value.bbox
  };

  // 添加到store，新记录放在最上方
  const updatedList = [newArea, ...areaStore.areaList];
  areaStore.setAreaList(updatedList);
  ElMessage.success("添加 【"+areaData.value.name+"】 重点关注区域成功！");

  // 触发事件
  emit('area-created', newArea);

  // 关闭表单
  showForm.value = false;
};

// 暴露方法给父组件
defineExpose({
  showCreateForm,
  closeForm
});
</script>

<style scoped lang="scss">
/* 对话框遮罩 */
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 对话框容器 */
.dialog-container {
  background-color: rgba(17, 24, 39, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

/* 对话框头部 */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0;
    color: white;
    font-size: 16px;
    font-weight: 500;
  }

  .dialog-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }
}

/* 对话框内容 */
.dialog-content {
  padding: 20px;
}

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