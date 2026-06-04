<template>
  <div v-if="warning" class="warning-handle">
    <el-input
      v-model="remark"
      type="textarea"
      :rows="2"
      placeholder="处置备注（可选）"
      maxlength="200"
      show-word-limit
    />
    <div class="warning-handle__actions">
      <el-button
        v-if="canHandle"
        size="small"
        type="warning"
        :loading="submitting"
        @click="submit('handle')"
      >
        处理
      </el-button>
      <el-button
        v-if="canClose"
        size="small"
        :loading="submitting"
        @click="submit('close')"
      >
        关闭
      </el-button>
      <span v-if="statusHint" class="warning-handle__hint">{{ statusHint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { handleWarning, closeWarning } from '@/api/v2/warning';
import { warningStatusText } from '@/utils/warningStatus';

const props = defineProps({
  warning: { type: Object, default: null },
});

const emit = defineEmits(['done']);

const remark = ref('');
const submitting = ref(false);

const status = computed(() => props.warning?.status || props.warning?.raw?.status || '');

const canHandle = computed(() => status.value === 'ACKNOWLEDGED');
const canClose = computed(() => ['ACKNOWLEDGED', 'HANDLED'].includes(status.value));

const statusHint = computed(() => {
  if (canHandle.value || canClose.value) return '';
  if (status.value === 'NEW') return '查看详情后将自动标记为已读';
  if (status.value === 'CLOSED') return '该预警已关闭';
  return `当前状态：${warningStatusText(status.value)}`;
});

watch(
  () => props.warning?.warningId,
  () => {
    remark.value = '';
  }
);

async function submit(action) {
  if (!props.warning?.warningId) return;
  submitting.value = true;
  try {
    const id = props.warning.warningId;
    if (action === 'handle') await handleWarning(id, remark.value);
    else await closeWarning(id, remark.value);
    ElMessage.success('操作成功');
    remark.value = '';
    emit('done');
  } catch (err) {
    ElMessage.error(err?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.warning-handle {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-handle__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.warning-handle__hint {
  font-size: 12px;
  color: #94a3b8;
}
</style>
