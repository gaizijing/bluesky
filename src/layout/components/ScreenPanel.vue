<template>
  <div class="screen-panel" :style="panelStyle">
    <div class="panel-header" v-if="showHeader">
      <div class="panel-title">{{ title }}</div>
      <div class="panel-extra">
        <slot name="extra"></slot>
      </div>
    </div>
    <div class="panel-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 面板标题
  title: {
    type: String,
    default: ''
  },
  // 是否显示头部
  showHeader: {
    type: Boolean,
    default: true
  },
  // 面板高度
  height: {
    type: String,
    default: 'auto'
  },
  // 是否显示边框
  border: {
    type: Boolean,
    default: true
  }
})

// 面板样式
// const panelStyle = computed(() => ({
//   height: props.height,
//   border: props.border ? `1px solid ${$border-color}` : 'none'
// }))
</script>

<style scoped lang="scss">
.screen-panel {
  background-color: $panel-background;
  border-radius: 8px;
  overflow: hidden;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid $border-color;

    .panel-title {
      font-size: 16px;
      font-weight: 500;
      color: #fff;
    }

    .panel-extra {
      color: #ccc;
      font-size: 14px;
    }
  }

  .panel-body {
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
    height: calc(100% - 50px); // 减去header高度
  }
}
</style>