<template>
  <div class="core-indicators-container">
   
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="indicator in indicators"
        :key="indicator.id"
        class="indicator-card"
        :class="indicator.status"
        @mouseenter="showTooltip(indicator, $event)"
        @mouseleave="hideTooltip()"
        @click="openDetailDialog(indicator)"
      >
        <div class="indicator-icon">
            <img 
            :src="getIndicatorIcon(indicator.id)" 
            :alt="indicator.name" 
            class="indicator-icon-img"
          />
        </div>
        <div>
           <div class="indicator-name">{{ indicator.name }}</div>
        <!-- 指标值和单位 -->
        <div class="indicator-value">
          {{ indicator.value }}
          <span class="indicator-unit">{{ indicator.unit }}</span>
        </div>
        </div>
       
        <!-- 状态标签 -->
        <!-- <div class="status-tag" :class="indicator.status">
          {{ statusTextMap[indicator.status] }}
        </div> -->
      </div>
    </div>

    <!-- 悬停提示框（绝对定位） -->
    <div
      v-if="showTooltipFlag"
      class="tooltip"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
      :class="{ 'tooltip-visible': showTooltipFlag }"
    >
      {{ tooltipContent }}
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetail" class="dialog-mask" @click="closeDetailDialog">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <span>{{ currentIndicator.name }} 详情</span>
          <button class="dialog-close" @click="closeDetailDialog">×</button>
        </div>
        <div class="dialog-content">
          <div class="detail-info">
            <p><span class="label">当前值：</span>{{ currentIndicator.value }}{{ currentIndicator.unit }}</p>
            <p><span class="label">精度：</span>{{ currentIndicator.precision }}</p>
            <p><span class="label">状态：</span>
              <span :class="`status-text ${currentIndicator.status}`">{{ statusTextMap[currentIndicator.status] }}</span>
            </p>
            <p>
              <span class="label">阈值：</span>
              警告={{ currentIndicator.threshold.warning }}{{ currentIndicator.unit }}，
              危险={{ currentIndicator.threshold.danger }}{{ currentIndicator.unit }}
            </p>
          </div>
          <!-- 趋势图占位区 -->
          <div class="trend-chart">
            <div class="chart-placeholder">趋势图加载中...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 导入Vue核心函数
import { ref, onMounted, reactive, computed } from "vue";
// 导入接口和工具函数
import { getCoreIndicators } from "@/api/meteorology";
import { formatUpdateTime } from "@/utils/formatUtils";

// 1. 定义响应式数据
const isLoading = ref(true);
const indicators = ref([]);
const updateTime = ref("");
const formattedUpdateTime = ref("暂无数据");

// 2. Tooltip相关
const showTooltipFlag = ref(false);
const tooltipContent = ref("");
const tooltipLeft = ref(0);
const tooltipTop = ref(0);

// 3. 详情弹窗相关
const showDetail = ref(false);
const currentIndicator = ref(null);
const statusTextMap = reactive({
  normal: "正常",
  warning: "警告",
  danger: "危险",
});

// 4. 指标图标映射 - 修改为返回图片路径
const getIndicatorIcon = (id) => {
  const iconMap = {
    temp: new URL("@/assets/icons/ic_temperature.png", import.meta.url).href,
    humidity: new URL("@/assets/icons/ic_humidity.png", import.meta.url).href,
    windSpeed: new URL("@/assets/icons/ic_windspeed.png", import.meta.url).href,
    visibility: new URL("@/assets/icons/ic_visibility.png", import.meta.url).href,
    cloudBase: new URL("@/assets/icons/ic_winddirection.png", import.meta.url).href,
    precipitation: new URL("@/assets/icons/ic_pm.png", import.meta.url).href
  };
  return iconMap[id] || new URL("@/assets/icons/icon-unknown.png", import.meta.url).href;
};

// 5. 页面初始化
onMounted(() => {
  fetchData();
  // 定时刷新：每30秒调用一次接口
  // setInterval(fetchData, 30000);
});

// 6. 数据获取方法
const fetchData = async () => {
  isLoading.value = true;
  try {
    const result = await getCoreIndicators();
    if (result.code === 200) {
      indicators.value = result.data.indicators;
      updateTime.value = result.data.updateTime;
      formattedUpdateTime.value = formatUpdateTime(updateTime.value);
    } else {
      console.error("接口返回错误：", result.message);
    }
  } catch (err) {
    console.error("数据请求失败：", err);
  } finally {
    isLoading.value = false;
  }
};

// 7. Tooltip方法
const showTooltip = (indicator, e) => {
  const tooltipMap = {
    temp: "气温：空气冷热程度，影响飞行器电池性能和设备稳定性",
    humidity: "湿度：空气中水汽含量，高湿度可能导致设备结露",
    windSpeed: "风速：空气流动速度，超过机型限制会影响飞行安全",
    visibility: "能见度：视觉可见距离，低能见度影响目视飞行",
    cloudBase: "云底高度：云层底部距离地面高度，低于飞行高度会影响视野",
    precipitation: "降水量：单位时间内的降雨/降雪量，雨雪会影响设备运行",
  };
  tooltipContent.value = tooltipMap[indicator.id] || "气象指标说明";
  tooltipLeft.value = e.clientX + 10;
  tooltipTop.value = e.clientY - 10;
  showTooltipFlag.value = true;
};

const hideTooltip = () => {
  showTooltipFlag.value = false;
};

// 8. 详情弹窗方法
const openDetailDialog = (indicator) => {
  currentIndicator.value = indicator;
  showDetail.value = true;
  // 阻止事件冒泡
  event.stopPropagation();
};

const closeDetailDialog = () => {
  showDetail.value = false;
};
</script>

<style scoped lang="scss">
// 颜色变量
$primary-color: #165dff;
$normal-color: #00b42a;
$warning-color: #ff7d00;
$danger-color: #f53f3f;
$text-primary: #ffffff;
$text-secondary: #86909c;
$bg-primary: #1d2129;
$bg-card: #282c34a1;
$border-radius: 8px;
$shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

// 容器样式
.core-indicators-container {
  width: 100%;
  height: $left-panel-core-elements-height;
 
  position: relative;
  overflow: hidden;
}

// 标题栏样式
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .title {
    font-size: 16px;
    color: $text-primary;
    margin: 0;
    font-weight: 500;
  }

  .update-time {
    font-size: 12px;
    color: $text-secondary;
  }
}

// 加载状态样式
.loading-container {
  width: 100%;
  height: calc(100% - 30px);  // 调整为适应200px高度
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .loading-spinner {
    width: 24px;  // 稍微减小
    height: 24px;
    border: 2px solid rgba(22, 93, 255, 0.3);
    border-top-color: $primary-color;
    border-radius: 50%;
    animation: spin 1.2s linear infinite;
  }

  .loading-text {
    margin-top: 10px;  // 减少间距
    font-size: 13px;   // 减小字体
    color: $text-secondary;
  }
}

// 旋转动画
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 卡片网格布局
// 卡片网格布局
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  height: calc(100% - 30px);  // 调整为适应200px高度
}

// 指标卡片样式
.indicator-card {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;

  .indicator-icon {
    font-size: 18px;  // 稍微减小图标
    color: $primary-color;
    margin-bottom: 6px;
    opacity: 0.8;
  }

  .indicator-name {
    font-size: 13px;  // 减小字体
    color: $text-secondary;
    margin-bottom: 3px;
  }

  .indicator-value {
    font-size: 20px;  // 减小数值字体
    font-weight: 600;
    color: $text-primary;
    line-height: 1.2;

    .indicator-unit {
      font-size: 14px;  // 减小单位字体
      margin-left: 3px;
      color: $text-secondary;
    }
  }

  .status-tag {
    position: absolute;
    top: 6px;  // 调整位置
    right: 6px;
    font-size: 11px;  // 减小字体
    padding: 1px 6px;  // 减少内边距
    border-radius: 10px;
    opacity: 0.9;
  }
}
.indicator-icon-img {
  width: 70px;
  object-fit: contain;
}
// 状态样式
.indicator-card.normal {
  & .status-tag {
    background-color: rgba(0, 180, 42, 0.2);
    color: $normal-color;
  }
}

.indicator-card.warning {
  & .status-tag {
    background-color: rgba(255, 125, 0, 0.2);
    color: $warning-color;
  }
  
  .indicator-value {
    color: $warning-color;
  }
}

.indicator-card.danger {
  & .status-tag {
    background-color: rgba(245, 63, 63, 0.2);
    color: $danger-color;
  }
  
  .indicator-value {
    color: $danger-color;
    animation: blink 0.8s ease-in-out infinite alternate;
  }
}

// 闪烁动画
@keyframes blink {
  from { opacity: 1; }
  to { opacity: 0.6; }
}

// 悬停提示框样式
.tooltip {
  position: fixed;
  background-color: rgba(255, 255, 255, 0.95);
  color: #1d2129;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none;
  max-width: 240px;
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.2s ease;

  &.tooltip-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-content {
  .detail-info {
    margin-bottom: 20px;
    line-height: 1.8;

    .label {
      color: $text-secondary;
      display: inline-block;
      width: 70px;
    }

    .status-text {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    .normal {
      background-color: rgba(0, 180, 42, 0.2);
      color: $normal-color;
    }

    .warning {
      background-color: rgba(255, 125, 0, 0.2);
      color: $warning-color;
    }

    .danger {
      background-color: rgba(245, 63, 63, 0.2);
      color: $danger-color;
    }
  }

  .trend-chart {
    height: 200px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-secondary;
    font-size: 14px;
  }
}

// 弹窗动画
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>