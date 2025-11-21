<!-- src/components/business/WeatherWarnings/index.vue -->
<template>
  <div>
    <div ref="chart" style="width: 100%; height: 180px"></div>

    <!-- 预警详情表格 -->
    <div class="warning-details-container">
      <div class="warning-details">
        <div class="table-header">
          <div class="table-cell">预警类型</div>
          <div class="table-cell">预警等级</div>
          <div class="table-cell">影响区域</div>
          <div class="table-cell">时间范围</div>
        </div>
        <div class="table-body">
          <div
            class="table-row"
            v-for="(item, index) in warningDetails"
            :key="index"
            @mouseenter="highlightBar(getDateFromTime(item.startTime))"
            @mouseleave="resetBarHighlight"
            @click="selectRow(index)"
            :class="{ selected: selectedRowIndex === index }"
          >
            <div class="table-cell">{{ item.type }}</div>
            <div class="table-cell" :class="`level-${item.level}`">
              {{ getLevelText(item.level) }}
            </div>
            <div class="table-cell">{{ item.area }}</div>
            <div class="table-cell">{{ item.startTime }}-{{ item.endTime }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as echarts from "echarts";import { ref, onMounted, onBeforeUnmount, watch,nextTick  } from "vue";
import { useDashboardStore } from "@/store/modules/dashboard";
const dashboardStore = useDashboardStore();


const chart = ref(null);
let myChart = null;
const selectedRowIndex = ref(-1);

// 气象预警详情数据（模拟风险预警数据结构）
const warningDetails = ref([
  {
    id: "RW20251103001",
    level: "danger",
    type: "强风",
    area: "A机场周边10km",
    startTime: "10:05:00",
    endTime: "11:30:00",
    detail: "当前风速14.8m/s，预计10:30后增至18m/s，超过多数机型限制",
    suggestion: "暂停该区域所有飞行任务，已起飞的立即返航",
    handleStatus: "unhandled"
  },
  {
    id: "RW20251103002",
    level: "warning",
    type: "低能见度",
    area: "B货运站至C工业园区航线",
    startTime: "11:00:00",
    endTime: "13:00:00",
    detail: "预计能见度将从5.2km降至2.5km，接近小型无人机限制阈值",
    suggestion: "小型无人机暂停飞行，大型飞行器需开启辅助导航",
    handleStatus: "unhandled"
  },
  {
    id: "RW20251103003",
    level: "info",
    type: "温度骤降",
    area: "D变电站周边5km",
    startTime: "14:00:00",
    endTime: "15:00:00",
    detail: "14时后温度将下降5℃，可能导致电池性能下降10%-15%",
    suggestion: "提前更换满电电池，缩短单次飞行时间",
    handleStatus: "handled"
  },
  {
    id: "RW20251103004",
    level: "danger",
    type: "湍流",
    area: "沿海搜救点附近",
    startTime: "10:30:00",
    endTime: "12:00:00",
    detail: "监测到中度湍流，垂直气流速度达3.5m/s，对低空飞行器有显著影响",
    suggestion: "救援任务调整航线，绕行湍流区域，高度提升至600m以上",
    handleStatus: "unhandled"
  },
  {
    id: "RW20251103005",
    level: "warning",
    type: "湿度超标",
    area: "G农场至H仓库航线",
    startTime: "09:00:00",
    endTime: "11:00:00",
    detail: "当前湿度85%，超过农业无人机安全阈值（80%）",
    suggestion: "暂停农药喷洒等作业，仅执行必要运输任务",
    handleStatus: "handled"
  },
  {
    id: "RW20251103006",
    level: "info",
    type: "云底高度下降",
    area: "I桥梁站周边3km",
    startTime: "13:30:00",
    endTime: "16:00:00",
    detail: "云底高度将从800m降至500m，不影响多数巡检任务",
    suggestion: "保持通信畅通，避开浓云区域",
    handleStatus: "handled"
  },
  {
    id: "RW20251103007",
    level: "warning",
    type: "风切变",
    area: "J飞行学院训练空域",
    startTime: "10:15:00",
    endTime: "11:45:00",
    detail: "监测到轻度风切变（水平风速变化4m/s），对新手训练有一定风险",
    suggestion: "暂停新手训练，仅安排熟练飞行员执行任务",
    handleStatus: "unhandled"
  },
  {
    id: "RW20251103008",
    level: "danger",
    type: "短时强降雨",
    area: "山区救援点周边8km",
    startTime: "11:00:00",
    endTime: "11:30:00",
    detail: "预计11时将出现短时强降雨，能见度骤降至0.5km",
    suggestion: "救援任务需在11前撤离该区域，待降雨结束后再进入",
    handleStatus: "unhandled"
  }
]);

// 获取预警等级文本
const getLevelText = (level) => {
  const levelMap = {
    danger: "危险预警",
    warning: "警告预警",
    info: "信息预警"
  };
  return levelMap[level] || level;
};

// 从时间字符串中提取日期（用于图表高亮）
const getDateFromTime = (timeString) => {
  // 这里简化处理，实际项目中可能需要根据具体需求调整
  return "11-03"; // 假设都是同一天的数据
};

onMounted(() => {
  myChart = echarts.init(chart.value);

  const option = {
    xAxis: {
      type: "category",
      data: ["11-01", "11-02", "11-03", "11-04", "11-05", "11-06", "11-07"],
      axisLine: {
        show: true,
        lineStyle: {
          color: "#ffffff",
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#ffffff",
        },
      },
      axisLabel: {
        color: "#ffffff",
      },
    },
    yAxis: [
      {
        type: "value",
        name: "预警数量",
        position: "left",
        axisLine: {
          show: true,
          lineStyle: {
            color: "#ffffff",
          },
        },
        axisLabel: {
          color: "#ffffff",
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: "总预警数",
        data: [2, 4, 8, 3, 5, 2, 1],
        type: "bar",
        barWidth: "20%",
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#3dd1ff" },
              { offset: 1, color: "transparent" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: "top",
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: "bold",
        },
      },

      // 危险预警 (danger)
      {
        name: "危险预警",
        type: "line",
        data: [1, 2, 3, 1, 2, 1, 0],
        smooth: true,
        symbol: "none",
        itemStyle: {
          color: "#ef4444", // 红色
        },
        lineStyle: {
          width: 1
        },
        areaStyle: {
          // 渐变填充（从红色到透明，增强层次感）
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1, // 渐变方向：从上到下
            [
              { offset: 0, color: "rgba(239,68,68,0.6)" }, // 上方：半透明红色
              { offset: 1, color: "rgba(239,68,68,0.05)" }, // 下方：接近透明
            ]
          ),
          // 阴影发光核心配置
          shadowBlur: 30, // 模糊程度（值越大，发光范围越广）
          shadowColor: "rgba(239,68,68,0.7)", // 发光颜色（与折线同色系，半透明）
          shadowOffsetY: 5, // 阴影向下偏移一点，增强立体感
          shadowOffsetX: 0,
        },
        label: {
          show: false,
        },
      },

      // 警告预警 (warning)
      {
        name: "警告预警",
        type: "line",
        data: [1, 1, 3, 1, 2, 1, 1],
        smooth: true,
        symbol: "none",
        itemStyle: {
          color: "#f59e0b", // 橙色
        },
        lineStyle: {
          width: 1,
        },
        areaStyle: {
          // 渐变填充（从橙色到透明，增强层次感）
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1, // 渐变方向：从上到下
            [
              { offset: 0, color: "rgba(255,154,46,0.6)" }, // 上方：半透明橙色
              { offset: 1, color: "rgba(255,154,46,0.05)" }, // 下方：接近透明
            ]
          ),
          // 阴影发光核心配置
          shadowBlur: 30, // 模糊程度（值越大，发光范围越广）
          shadowColor: "rgba(255,154,46,0.7)", // 发光颜色（与折线同色系，半透明）
          shadowOffsetY: 5, // 阴影向下偏移一点，增强立体感
          shadowOffsetX: 0,
        },
        label: {
          show: false,
        },
      },

      // 信息预警 (info)
      {
        name: "信息预警",
        type: "line",
        data: [0, 1, 2, 1, 1, 0, 0],
        smooth: true,
        symbol: "none",
        itemStyle: {
          color: "#3b82f6", // 蓝色
        },
        lineStyle: {
          width: 1,
        },
        areaStyle: {
          // 渐变填充（从蓝色到透明，增强层次感）
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1, // 渐变方向：从上到下
            [
              { offset: 0, color: "rgba(59,130,246,0.6)" }, // 上方：半透明蓝色
              { offset: 1, color: "rgba(59,130,246,0.05)" }, // 下方：接近透明
            ]
          ),
          // 阴影发光核心配置
          shadowBlur: 30, // 模糊程度（值越大，发光范围越广）
          shadowColor: "rgba(59,130,246,0.7)", // 发光颜色（与折线同色系，半透明）
          shadowOffsetY: 5, // 阴影向下偏移一点，增强立体感
          shadowOffsetX: 0,
        },
        label: {
          show: false,
        },
      },
    ],
    grid: {
      left: "3%",
      right: "3%",
      top: "30%",
      bottom: "0%",
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      borderColor: "#ff6b6b",
      borderWidth: 1,
      textStyle: {
        color: "#ffffff",
      },
      formatter: function (params) {
        let tooltipText = params[0].axisValueLabel + "<br/>";
        params.forEach((item) => {
          tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}: ${item.value}<br/>`;
        });
        return tooltipText;
      },
    },
    legend: {
      show: true,
      top: "top",
      textStyle: {
        color: "#ffffff",
      },
      data: ["总预警数", "危险预警", "警告预警", "信息预警"],
    },
  };

  myChart.setOption(option);

  window.addEventListener("resize", () => {
    myChart.resize();
  });
});
watch(
  () => dashboardStore.currentModule,
  (newVal) => {
    // 等待 DOM 更新
    nextTick(() => {
      // 如果图表已初始化，直接 resize；否则初始化图表
      if (myChart) {
        myChart.resize();
      } else {
        initChart();
      }
    });
  }
);

// 高亮对应日期的柱子
const highlightBar = (date) => {
  if (!myChart) return;

  const dateIndex = [
    "11-01",
    "11-02",
    "11-03",
    "11-04",
    "11-05",
    "11-06",
    "11-07",
  ].indexOf(date);

  if (dateIndex !== -1) {
    myChart.dispatchAction({
      type: "showTip",
      seriesIndex: 0,
      dataIndex: dateIndex,
    });

    myChart.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      dataIndex: dateIndex,
    });
  }
};

// 重置柱子高亮
const resetBarHighlight = () => {
  if (!myChart) return;

  myChart.dispatchAction({
    type: "hideTip",
  });

  myChart.dispatchAction({
    type: "downplay",
  });
};

// 选择行
const selectRow = (index) => {
  selectedRowIndex.value = index;
};
</script>

<style scoped lang="scss">
.warning-details-container {
  height: 240px;
  overflow: hidden;
}

.warning-details {
  display: flex;
  flex-direction: column;
  height: 100%;
}



// 预警等级颜色
.level-danger {
  color: #ef4444;
}

.level-warning {
  color: #f59e0b;
}

.level-info {
  color: #3b82f6;
}

.table-header .table-cell {
  font-weight: bold;
  color: #b3c7e6;
}
</style>