<template>
  <!-- 使用Teleport将弹窗直接挂载到body上，完全脱离父组件控制 -->
  <Teleport to="body">
    <div v-if="visible" class="dialog-mask fade-in" @click="handleMaskClick">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <h3>{{ title }}</h3>
          <button class="dialog-close" @click="handleClose">×</button>
        </div>
        <div class="dialog-content">
          <slot></slot>
        </div>
        <div v-if="$slots.footer" class="dialog-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

// 定义属性
const props = defineProps({
  // 弹窗标题
  title: {
    type: String,
    default: '对话框'
  },
  // 是否显示弹窗
  visible: {
    type: Boolean,
    default: false
  },
  // 是否点击遮罩层关闭
  closeOnClickMask: {
    type: Boolean,
    default: true
  }
});

// 定义事件
const emit = defineEmits(['close']);

// 处理关闭
const handleClose = () => {
  emit('close');
};

// 处理点击遮罩层
const handleMaskClick = () => {
  if (props.closeOnClickMask) {
    emit('close');
  }
};
</script>

<style scoped lang="scss">

// 详情弹窗遮罩
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5); // 半透明黑色遮罩
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; // 最高层级
  transition: opacity 0.3s ease;
  font-style: normal;
  font-family: "aideepFont";
  .dialog-container {
    transform: scale(0.95);
    transition: transform 0.3s ease;
  }

  &.fade-in {
    .dialog-container {
      transform: scale(1);
    }
  }
}

// 弹窗容器
.dialog-container {
  // border: 1px solid #3b82f6;
  background-color: #0f1733;
  border-radius: 8px;
  background-image: url("@/assets/images/bg_dialog.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  width: 750px;
  max-height: 90vh;
  padding: 35px;
  overflow: scroll;

  // 自定义滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;

    .dialog-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;

      &:hover {
        color: #ffffff;
      }
    }
  }

  .dialog-content {
    color: #e2e8f0;
    font-size: 14px;
    line-height: 1.8; // 行高，增强可读性
    overflow-y: auto; // 内容超出时显示滚动条
    padding-right: 5px; // 为滚动条预留空间

    p {
      margin: 5px 0;
    }

  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dialog-container {
    width: 95%;
    max-width: 95%;
  }
}
</style>