<template>
  <div class="route-warning-card">

    
    <!-- 全局选项卡导航 -->
    <div class="global-tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-item"
        :class="{ active: globalActiveTab === tab.key }"
        @click="globalActiveTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>

    <!-- 图表区域 -->
    <div v-if="globalActiveTab === 'chart'" class="tab-panel">
      <div class="chart-container">
        <div ref="chartRef" class="risk-chart"></div>
      </div>

      <!-- 控制区与图例 -->
      <div class="chart-controls">
        <!-- 风险维度显示已移除 -->
      </div>
    </div>

    <!-- 悬浮详情tooltip -->
    <div
      v-if="showTooltip && globalActiveTab === 'chart'"
      class="detail-tooltip"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
    >
      <div class="tooltip-header">
        <h4>
          航段 {{ tooltipData.segment }}（{{ tooltipData.distance.toFixed(1) }}km处）
        </h4>
      </div>
      <div class="tooltip-content">
        <p>
          <span>综合风险：</span>{{ tooltipData.risk.toFixed(2) }} ({{ getRiskText(tooltipData.risk) }})
        </p>
        <p>
          <span>风速：</span>{{ tooltipData.windSpeed }}m/s（{{ tooltipData.windDir }}°）
        </p>
        <p>
          <span>风切变：</span>{{ tooltipData.windShear.toFixed(1) }} ({{ getLevelText(tooltipData.windShear) }})
        </p>
        <p>
          <span>湍流：</span>{{ tooltipData.turbulence.toFixed(1) }} ({{ getLevelText(tooltipData.turbulence) }})
        </p>
        <p><span>降水：</span>{{ tooltipData.rainfall }}mm/h</p>
      </div>
    </div>
    
    <!-- 应对措施面板 -->
    <div v-if="globalActiveTab === 'measures'" class="tab-panel">
      <div class="measures-content">
        <h3 class="panel-title">风险应对措施</h3>
        <div 
          v-for="(rec, index) in recommendations" 
          :key="index"
          class="recommendation-item"
          :class="`risk-level-${rec.level}`"
        >
          <span class="rec-icon">{{ rec.icon }}</span>
          <div class="rec-content">
            <h4>{{ rec.title }}</h4>
            <p>{{ rec.description }}</p>
          </div>
        </div>
        <div v-if="recommendations.length === 0" class="empty-state">
          <p>暂无风险应对措施建议</p>
        </div>
      </div>
    </div>

    <!-- 备选航线面板 -->
    <div v-if="globalActiveTab === 'alternatives'" class="tab-panel">
      <div class="alternatives-content">
        <h3 class="panel-title">备选航线建议</h3>
        <div 
          v-for="(route, index) in alternativeRoutes" 
          :key="index"
          class="alternative-item"
          @click="selectAlternativeRoute(route)"
        >
          <div class="route-header">
            <span class="route-name">{{ route.name }}</span>
            <span class="route-risk" :class="`risk-${route.riskLevel}`">
              {{ route.riskText }}
            </span>
          </div>
          <div class="route-details">
            <span>距离: {{ route.distance }}km</span>
            <span>预计时间: {{ route.estimatedTime }}</span>
          </div>
          <div class="route-description">
            {{ route.description }}
          </div>
        </div>
        <div v-if="alternativeRoutes.length === 0" class="empty-state">
          <p>暂无备选航线建议</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import { useDashboardStore } from "@/store/modules/dashboard"; 
const dashboardStore = useDashboardStore();
import eventManager from '@/cesium/core/eventManager';

// 定义组件事件
const emit = defineEmits(['highlightSegment', 'alternativeRouteSelected']);

// 接收父组件传入的航线数据
const props = defineProps({
  currentRoute: {
    type: Object,
    required: true,
    default: () => ({
      name: "机场A-作业区B",
      length: 18.5,
      segments: 8,
    })
  },
  routeData: {
    type: Array,
    default: () => []
  }
});

// 响应式处理航线数据
const routeData = ref([]);

// 计算属性获取当前航线信息
const currentRoute = computed(() => props.currentRoute);

// 组件状态
const isRefreshing = ref(false);
const chartRef = ref(null);
const riskChart = ref(null);
const showTooltip = ref(false);
const tooltipData = ref({});
const tooltipLeft = ref(0);
const tooltipTop = ref(0);

// 全局选项卡状态
const globalActiveTab = ref('chart'); // 默认显示图表

// 控制面板切换状态（内部子选项卡）
const activeTab = ref('recommendations'); // 默认显示应对措施

// 定义选项卡配置
const tabs = [
  { key: 'chart', label: '风险图表', icon: '📊' },
  { key: 'measures', label: '应对措施', icon: '🛡️' },
  { key: 'alternatives', label: '备选航线', icon: '🗺️' }
];

// 风险维度配置（支持多维度叠加）
const riskDimensions = ref([
  { label: "综合风险", value: "risk", icon: "📊", color: "#3b82f6" },
  { label: "风切变", value: "windShear", icon: "💨", color: "#8b5cf6" },
  { label: "湍流", value: "turbulence", icon: "🌊", color: "#ec4899" },
  { label: "降水", value: "rainfall", icon: "🌧️", color: "#10b981" },
]);

// 风险维度默认全部显示

// 风险等级配置
const riskLevels = ref([
  { value: 0, label: "低风险", color: "#10b981", range: "0-0.3" },
  { value: 1, label: "中风险", color: "#f59e0b", range: "0.3-0.7" },
  { value: 2, label: "高风险", color: "#ef4444", range: "0.7-1.0" },
]);

// 生成模拟航线数据
const generateRouteData = () => {
  const { length, segments } = currentRoute.value;
  const segmentLength = length / segments;
  return Array(segments)
    .fill(0)
    .map((_, i) => {
      // 基础风险值（模拟波动趋势）
      const baseRisk = 0.2 + Math.sin(i * 0.6) * 0.3 + Math.random() * 0.4;
      const risk = Math.min(1, Math.max(0, baseRisk)); // 限制在0-1之间

      return {
        segment: i + 1,
        distance: (i + 1) * segmentLength,
        risk,
        windSpeed: +(3 + Math.random() * 12).toFixed(1),
        windDir: Math.floor(Math.random() * 360),
        windShear: risk * 10, // 0-10
        turbulence: +(risk * 8 + Math.random() * 2).toFixed(1), // 0-10
        rainfall: +(risk * 4 + Math.random() * 1).toFixed(1), // 0-5
        coordinates: [
          116.3 + i * 0.06,
          39.9 + i * 0.04,
        ],
      };
    });
};

// 处理窗口大小变化
const handleResize = () => {
  riskChart.value?.resize();
};

// 初始化图表（优化版）
const initChart = () => {
  console.log('=== 开始初始化图表 ===');
  // 关键：检查 DOM 元素是否存在
  if (!chartRef.value) {
    console.warn("图表容器 DOM 元素不存在");
    return;
  }
  console.log('DOM 元素存在', chartRef.value);
  
  // 检查 routeData
  console.log('routeData 长度:', routeData.value.length);
  console.log('routeData 内容:', routeData.value);
  
  // 检查 riskDimensions
  console.log('riskDimensions 长度:', riskDimensions.value.length);
  console.log('riskDimensions 内容:', riskDimensions.value);
  
  if (riskChart.value) riskChart.value.dispose();
  riskChart.value = echarts.init(chartRef.value);
  console.log('ECharts 实例创建成功', riskChart.value);

  // 生成系列数据
  const seriesData = getSeriesData();
  console.log('系列数据生成成功', seriesData);
  
  // 图表配置（优化部分）
  const option = {
    // 1. 网格调整：增加边距，避免内容拥挤
    grid: {
      left: "1%",
      right: "5%",
      bottom: "5%", // 底部留足空间显示x轴标签
      top: "15%",
      containLabel: true,
    },

    // 2. x轴优化：更清晰的刻度与标签
    xAxis: {
      type: "category",
      data: routeData.value.map((item) => `段${item.segment}`),
      axisLine: { lineStyle: { color: "#475569" } },
      axisLabel: {
        color: "#94a3b8",
        rotate: 30, // 旋转标签避免重叠
        interval: 0, // 强制显示所有标签
        fontSize: 12,
      },
      splitLine: { show: false },
      name: "航段",
      nameTextStyle: { color: "#94a3b8", padding: [15, 0, 0, 0] },
    },

    // 3. y轴优化：增加风险等级参考线
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      axisLine: { lineStyle: { color: "#475569" } },
      axisLabel: {
        color: "#94a3b8",
        formatter: "{value}",
        fontSize: 12,
      },
      // 风险等级分隔线（视觉参考）
      splitLine: { 
        lineStyle: { 
          color: [
            "rgba(16, 185, 129, 0.2)", // 低风险区域背景线
            "rgba(245, 158, 11, 0.2)", // 中风险区域背景线
            "rgba(239, 68, 68, 0.2)"   // 高风险区域背景线
          ]
        } 
      },
      // 风险等级区间标记
      boundaryGap: false,
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            "rgba(16, 185, 129, 0.05)",
            "rgba(245, 158, 11, 0.05)",
            "rgba(239, 68, 68, 0.05)"
          ]
        }
      },
      name: "风险指数",
      nameTextStyle: { color: "#94a3b8", padding: [0, 0, 0, 10] },
    },

    // 4. 系列数据：分组显示+风险等级色+数据标签
    series: getSeriesData(),

    // 5. 提示框优化：更直观的信息展示
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(15, 23, 51, 0.95)",
      borderColor: "#3b82f6",
      borderWidth: 1,
      padding: 12,
      textStyle: { color: "#e2e8f0" },
      formatter: function(params) {
        const segment = params[0].name;
        const baseData = routeData.value.find(
          item => `段${item.segment}` === segment
        );
        let content = `<div style="font-weight: bold; margin-bottom: 8px; color: #3b82f6">${segment}（${baseData.distance.toFixed(1)}km处）</div>`;
        
        params.forEach(p => {
          const value = p.value.toFixed(2);
          const label = p.seriesName;
          // 显示原始值（非归一化）
          const rawValue = label === "风切变" ? baseData.windShear.toFixed(1) :
                         label === "湍流" ? baseData.turbulence.toFixed(1) :
                         label === "降水" ? baseData.rainfall.toFixed(1) :
                         value;
          content += `<div>${label}：${rawValue} ${label === "综合风险" ? `(${getRiskText(baseData.risk)})` : ''}</div>`;
        });
        return content;
      }
    },

    // 6. 图例优化：位置与样式调整
    legend: {
      data: riskDimensions.value.map(dim => dim.label),
      top: "top",
      left: "center",
      textStyle: { color: "#94a3b8" },
      itemGap: 15,
      icon: "circle", // 圆形图例更易区分
      itemWidth: 8,
      itemHeight: 8
    },

    // 7. 动画效果：提升交互体验
    animation: true,
    animationDuration: 500,
    animationEasing: "cubicOut"
  };

  riskChart.value.setOption(option);
  console.log('图表配置设置成功');

  // 交互事件保持不变（点击高亮、悬停提示）
  riskChart.value.on("click", handleSegmentClick);
  riskChart.value.on("mousemove", handleSegmentHover);
  riskChart.value.on("mouseout", () => {
    showTooltip.value = false;
  });
};

// 生成系列数据（优化版：分组显示+风险等级色）
const getSeriesData = () => {
  return riskDimensions.value.map((dimConfig) => {
    const dim = dimConfig.value;
    const isMainIndex = dim === "risk";
    
    // 根据不同要素选择图表类型
    let chartType = "line";
    let chartConfig = {};
    
    // 综合风险使用柱状图
    if (dim === "risk") {
      chartType = "bar";
      chartConfig = {
        barWidth: 25,
        barGap: "15%",
        barCategoryGap: "35%",
        borderRadius: [4, 4, 0, 0],
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)"
      };
    } 
    // 其他所有要素使用折线图
    else {
      chartType = "line";
      chartConfig = {
        symbol: "circle",
        symbolSize: 7,
        lineStyle: {
          width: 2.5
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: dimConfig.color + "60" }, // 添加透明度
            { offset: 1, color: dimConfig.color + "10" }
          ])
        }
      };
    }

    return {
      name: dimConfig.label,
      type: chartType,
      data: routeData.value.map((item) => {
        // 计算归一化值（保持原逻辑）
        let value;
        if (dim === "windShear" || dim === "turbulence") {
          value = item[dim] / 10;
        } else if (dim === "rainfall") {
          value = item[dim] / 5;
        } else {
          value = item[dim];
        }

        // 为每个数据点添加风险等级标识（用于颜色映射）
        return {
          value,
          riskLevel: getRiskLevel(value) // 0-低 1-中 2-高
        };
      }),
      // 取消堆叠，确保图表不叠加
      stack: null, 
      // 按风险等级动态着色
      itemStyle: {
        color: (params) => {
          const level = params.data.riskLevel;
          return riskLevels.value[level].color;
        },
        ...chartConfig
      },
      // 线样式配置（仅折线图）
      lineStyle: chartType === "line" ? chartConfig.lineStyle : undefined,
      // 区域填充样式（仅折线图）
      areaStyle: chartType === "line" ? chartConfig.areaStyle : undefined,
      // 标记点样式（仅折线图）
      symbol: chartType === "line" ? chartConfig.symbol : undefined,
      symbolSize: chartType === "line" ? chartConfig.symbolSize : undefined,
      // 柱状图特定配置
      barWidth: chartType === "bar" ? chartConfig.barWidth : undefined,
      barGap: chartType === "bar" ? chartConfig.barGap : undefined,
      barCategoryGap: chartType === "bar" ? chartConfig.barCategoryGap : undefined,
      // 显示数据标签（直观看到数值）
      label: {
        show: chartType === "bar", // 仅柱状图显示标签
        position: "top",
        color: "#e2e8f0",
        fontSize: 10,
        formatter: (params) => params.value.toFixed(2)
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "#3b82f6"
        }
      },
      z: isMainIndex ? 2 : 1,
    };
  });
};

// 辅助函数：获取风险等级（0-低 1-中 2-高）
const getRiskLevel = (value) => {
  if (value < 0.3) return 0;
  if (value < 0.7) return 1;
  return 2;
};

// 监听props变化，更新数据
watch(() => props.routeData, (newData) => {
  routeData.value = newData.length > 0 ? newData : generateRouteData();
  initChart();
}, { immediate: true });

// 监听航线基本信息变化
watch(currentRoute, () => {
  if (props.routeData.length === 0) {
    routeData.value = generateRouteData();
    initChart();
  }
}, { deep: true });

// 航段点击事件（高亮地图对应区域）
const handleSegmentClick = (params) => {
  const segmentData = routeData.value[params.dataIndex];
  if (segmentData) {
    emit('highlightSegment', {
      segment: segmentData.segment,
      coordinates: segmentData.coordinates,
      risk: segmentData.risk
    });
  }
};

// 航段悬停事件（显示详细参数）
const handleSegmentHover = (params) => {
  if (params.componentType === "series") {
    const segmentData = routeData.value[params.dataIndex];
    if (segmentData) {
      tooltipData.value = { ...segmentData };
      // 计算tooltip位置（相对于卡片定位）
      const cardRect = chartRef.value.getBoundingClientRect();
      tooltipLeft.value = params.event.event.clientX - cardRect.left + 10;
      tooltipTop.value = params.event.event.clientY - cardRect.top - 10;
      showTooltip.value = true;
    }
  }
};



// 刷新数据
const refreshData = async () => {
  isRefreshing.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    routeData.value = generateRouteData();
    initChart();
  } finally {
    isRefreshing.value = false;
  }
};

// 辅助函数：风险文本转换
const getRiskText = (value) => {
  if (value < 0.3) return "低风险";
  if (value < 0.7) return "中风险";
  return "高风险";
};

// 辅助函数：等级文本转换
const getLevelText = (value) => {
  if (value < 3) return "弱";
  if (value < 7) return "中";
  return "强";
};

// 初始化与清理
// 时间变化处理函数
const handleTimeChange = (eventData) => {
  console.log('RouterRisk收到时间变化事件:', eventData);
  // 时间变化时，更新航线分析数据
  isRefreshing.value = true;
  
  // 模拟根据时间偏移量更新航线数据
  setTimeout(() => {
    // 重新生成航线数据（根据时间偏移量调整）
    initChart();
    isRefreshing.value = false;
  }, 300);
};

onMounted(() => {
  nextTick(() => {
    initChart();
    window.addEventListener("resize", handleResize);
  });
  
  // 注册时间变化事件监听器
  eventManager.on('timeChange', handleTimeChange);
});

onUnmounted(() => {
  if (riskChart.value) {
    riskChart.value.dispose();
  }
  window.removeEventListener("resize", handleResize);
  clearInterval(refreshInterval);
  
  // 移除时间变化事件监听器
  eventManager.off('timeChange', handleTimeChange);
});

// 监听仪表盘模块变化，调整图表大小或重新初始化
watch(
  () => dashboardStore.currentModule,
  () => {
    nextTick(() => {
      if (riskChart.value) {
        riskChart.value.resize();
      } else {
        initChart();
      }
    });
  }
);

// 监听标签页切换，当切回图表时重新初始化
watch(
  () => globalActiveTab.value,
  (newTab) => {
    if (newTab === 'chart') {
      nextTick(() => {
        initChart();
      });
    }
  }
);



// 应对措施建议
const recommendations = computed(() => {
  const suggestions = [];
  
  // 分析各段风险数据
  const highRiskSegments = routeData.value.filter(segment => segment.risk >= 0.7);
  const mediumRiskSegments = routeData.value.filter(segment => segment.risk >= 0.3 && segment.risk < 0.7);
  
  // 风切变风险分析
  const highWindShearSegments = routeData.value.filter(segment => segment.windShear >= 7);
  
  // 湍流风险分析
  const highTurbulenceSegments = routeData.value.filter(segment => segment.turbulence >= 7);
  
  // 降水风险分析
  const highRainfallSegments = routeData.value.filter(segment => segment.rainfall >= 3);
  
  // 针对高风险航段提出建议
  if (highRiskSegments.length > 0) {
    suggestions.push({
      level: 'high',
      icon: '⚠️',
      title: '高风险航段预警',
      description: `检测到 ${highRiskSegments.length} 个高风险航段，建议飞行高度调整至 ${getAltitudeRecommendation(highRiskSegments)} 或考虑更改航线`
    });
  }
  
  // 针对风切变提出建议
  if (highWindShearSegments.length > 0) {
    suggestions.push({
      level: 'medium',
      icon: '💨',
      title: '风切变风险提醒',
      description: `${highWindShearSegments.length} 个航段存在较强风切变，建议调整飞行速度并加强飞行姿态监控`
    });
  }
  
  // 针对湍流提出建议
  if (highTurbulenceSegments.length > 0) {
    suggestions.push({
      level: 'medium',
      icon: '🌊',
      title: '湍流风险提醒',
      description: `${highTurbulenceSegments.length} 个航段存在明显湍流，建议启用防湍流模式并提醒乘客系好安全带`
    });
  }
  
  // 针对降水提出建议
  if (highRainfallSegments.length > 0) {
    suggestions.push({
      level: 'low',
      icon: '🌧️',
      title: '降水影响提醒',
      description: `${highRainfallSegments.length} 个航段存在降水，注意能见度影响及湿滑跑道`
    });
  }
  
  return suggestions;
});

// 替代航线建议
const alternativeRoutes = ref([
  {
    id: 1,
    name: "北部绕行航线",
    riskLevel: "low",
    riskText: "低风险",
    distance: 22.3,
    estimatedTime: "15分钟",
    description: "从北部山区绕行，避开主要降水区域，风险降低约40%",
    coordinates: [] // 实际应用中应该包含坐标数据
  },
  {
    id: 2,
    name: "南部沿海航线",
    riskLevel: "medium",
    riskText: "中风险",
    distance: 25.7,
    estimatedTime: "18分钟",
    description: "沿南部海岸飞行，风力较小但路程稍远",
    coordinates: []
  }
]);

// 获取飞行高度建议
const getAltitudeRecommendation = (segments) => {
  // 根据风速和湍流情况给出高度建议
  const avgWindSpeed = segments.reduce((sum, seg) => sum + seg.windSpeed, 0) / segments.length;
  const avgTurbulence = segments.reduce((sum, seg) => sum + seg.turbulence, 0) / segments.length;
  
  if (avgWindSpeed > 10 || avgTurbulence > 7) {
    return "600-800米";
  } else if (avgWindSpeed > 7 || avgTurbulence > 5) {
    return "400-600米";
  } else {
    return "300-500米";
  }
};

// 选择替代航线
const selectAlternativeRoute = (route) => {
  emit('alternativeRouteSelected', route);
};
</script>

<style scoped lang="scss">
// 卡片基础样式
.route-warning-card {
  padding: 15px;
  position: relative;
  overflow: auto;
  background-color: rgba(15, 23, 51, 0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  // 自定义滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
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
}

// 卡片头部
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .card-icon {
    font-size: 24px;
    color: #3b82f6;
  }

  .header-text {
    margin-left: 12px;
    flex: 1;

    p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #94a3b8;

      .route-info {
        margin-left: 10px;
        color: #60a5fa;
      }
    }
  }

  .refresh-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #3b82f6;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

// 全局选项卡样式
.global-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 16px;
  
  .tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    cursor: pointer;
    color: #94a3b8;
    font-size: 13px;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
    
    &:hover {
      color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.05);
    }
    
    &.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.05);
    }
    
    .tab-icon {
      font-size: 14px;
    }
    
    .tab-label {
      font-weight: 500;
    }
  }
}

// 图表容器
.chart-container {
  height: 200px;
  position: relative;
  margin-bottom: 16px;
}

.risk-chart {
  width: 100%;
  height: 100%;
}


// 维度控制按钮
.dimension-controls {
  margin-bottom: 15px;

  .control-label {
    display: inline-block;
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 8px;
  }

  .dimension-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .dim-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 4px;
    color: #94a3b8;
    font-size: 12px;
    padding: 4px 10px;
    cursor: pointer;
    transition: all 0.2s;

    .dim-icon {
      font-size: 14px;
    }

    &.active {
      background-color: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #3b82f6;
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }

    &:hover:not(.active) {
      border-color: rgba(59, 130, 246, 0.5);
      color: #bfdbfe;
    }
  }
}

// 风险等级图例
.risk-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-text {
      color: #94a3b8;
    }
  }
}

// 悬浮详情tooltip
.detail-tooltip {
  position: absolute;
  background-color: rgba(15, 23, 51, 0.95);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none;
  width: 240px;

  .tooltip-header {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    h4 {
      margin: 0;
      font-size: 14px;
      color: #3b82f6;
    }
  }

  .tooltip-content {
    padding: 10px 12px;
    font-size: 13px;

    p {
      margin: 4px 0;
      line-height: 1.4;

      span {
        color: #94a3b8;
        display: inline-block;
        width: 70px;
      }
    }
  }
}

// 动画
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 响应式适配
@media (max-width: 600px) {
  .route-warning-card {
    padding: 15px;
  }

  .chart-container {
    height: 250px;
  }
  
  .global-tabs {
    flex-wrap: wrap;
    
    .tab-item {
      padding: 8px 12px;
      font-size: 12px;
      
      .tab-icon {
        font-size: 13px;
      }
    }
  }
}

// 选项卡面板通用样式
.tab-panel {
  min-height: 200px;
}

// 面板标题
.panel-title {
  font-size: 16px;
  color: #e2e8f0;
  margin-bottom: 16px;
  font-weight: 600;
}

// 应对措施内容样式
.measures-content {
  padding-bottom: 10px;
}

// 备选航线内容样式
.alternatives-content {
  padding-bottom: 10px;
}

// 空状态样式
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-size: 14px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.05);
}

.section-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  
  .tab-btn {
    padding: 6px 12px;
    font-size: 13px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 4px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
    
    &.active {
      background-color: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #3b82f6;
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }
    
    &:hover:not(.active):not(:disabled) {
      border-color: rgba(59, 130, 246, 0.5);
      color: #bfdbfe;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.section-content {
  min-height: 120px;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 5px;
  &.risk-level-high {
    border-left: 4px solid #ef4444;
    background-color: rgba(239, 68, 68, 0.05);
  }
  
  &.risk-level-medium {
    border-left: 4px solid #f59e0b;
    background-color: rgba(245, 158, 11, 0.05);
  }
  
  &.risk-level-low {
    border-left: 4px solid #10b981;
    background-color: rgba(16, 185, 129, 0.05);
  }
  
  .rec-icon {
    font-size: 18px;
  }
  
  .rec-content {
    flex: 1;
    
    h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #e2e8f0;
    }
    
    p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.4;
    }
  }
}

.alternative-item {
  padding: 12px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(59, 130, 246, 0.3);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 5px;
  &:hover {
    background-color: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
  }
  
  .route-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .route-name {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    }
    
    .route-risk {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
      
      &.risk-high {
        background-color: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
      
      &.risk-medium {
        background-color: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }
      
      &.risk-low {
        background-color: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
    }
  }
  
  .route-details {
    display: flex;
    gap: 15px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #94a3b8;
  }
  
  .route-description {
    font-size: 13px;
    color: #cbd5e1;
    line-height: 1.4;
  }
}
</style>