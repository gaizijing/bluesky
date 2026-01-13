<!-- src/components/business/EquipmentAlarm/index.vue -->
<template>
  <div>
    <div ref="chart" style="width: 100%; height: 280px;"></div>
    <!-- 告警详情表格 -->
    <div class="alarm-details-container">
      <div class="alarm-details">
        <div class="table-header">
          <div class="table-cell">设备类型</div>
          <div class="table-cell">设备名称</div>
          <div class="table-cell">告警内容</div>
          <div class="table-cell">告警时间</div>
        </div>
        <div class="table-body">
          <div class="table-row" v-for="(item, index) in alarmDetails" :key="index"
            @mouseenter="highlightBar(item.date)" @mouseleave="resetBarHighlight" @click="selectRow(index)"
            :class="{ selected: selectedRowIndex === index }">
            <div class="table-cell">{{ item.deviceType }}</div>
            <div class="table-cell">{{ item.deviceName }}</div>
            <div class="table-cell">{{ item.alarmContent }}</div>
            <div class="table-cell">{{ item.alarmTime }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";

// 导入 ECharts
import * as echarts from 'echarts';
import { useDeviceStore } from "@/store/modules/device";
import { computed } from 'vue';
import { useModuleStore } from "@/store/modules/module";
const moduleStore = useModuleStore();
const chart = ref(null); // 绑定 DOM 容器
let myChart = null;
const selectedRowIndex = ref(-1); // 当前选中的行索引

// 从store获取告警详情
const alarmDetails = computed(() => {
  return useDeviceStore().getEquipmentAlarm();
});

// 组件挂载后初始化图表（确保 DOM 已存在）
onMounted(() => {
  // 初始化图表
  myChart = echarts.init(chart.value);

  // 配置图表选项
  const option = {
    xAxis: {
      type: 'category',
      data: ['10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04'],
      axisLine: {
        show: true,
        lineStyle: {
          color: '#ffffff'
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#ffffff'
        }
      },
      axisLabel: {
        color: '#ffffff'
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '告警次数',
        position: 'left',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ffffff'
          }
        },
        axisLabel: {
          color: '#ffffff'
        },
        splitLine: {
          show: false
        }
      },
      {
        type: 'value',
        name: '在线率(%)',
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ffffff'
          }
        },
        axisLabel: {
          color: '#ffffff'
        },
        splitLine: {
          show: false
        },
        min: 0,
        max: 100
      }
    ],
    series: [
      {
        name: '告警次数',
        data: [3, 1, 3, 1, 1, 1, 3],
        type: 'bar',
        barWidth: '20%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#3dd1ff' },
              { offset: 1, color: '#3dd1ff' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      {
        name: '设备在线率',
        type: 'line',
        yAxisIndex: 1,
        data: [95, 98, 92, 96, 97, 99, 94],
        smooth: true,
        symbolSize: 8,
        symbol: 'circle',
        itemStyle: {
          color: '#FFD700'
        },
        lineStyle: {
          width: 1,
          type: 'solid'
        },
        areaStyle: {
          opacity: 0.1,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FFD700' },
            { offset: 1, color: 'transparent' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: '#FFD700',
          fontSize: 12,
          formatter: '{c}%'
        }
      },
      {
        name: '故障设备数',
        type: 'line',
        data: [1, 0, 2, 1, 0, 1, 2],
        smooth: true,
        symbolSize: 8,
        symbol: 'diamond',
        itemStyle: {
          color: '#FF6347'
        },
        lineStyle: {
          width: 1,
          type: 'dashed'
        },
        areaStyle: {
          opacity: 0.1,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FF6347' },
            { offset: 1, color: 'transparent' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: '#FF6347',
          fontSize: 12
        }
      }
    ],
    grid: {
      left: '3%',
      right: '3%',
      top: '30%',
      bottom: '0%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#3dd1ff',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff'
      },
      formatter: function (params) {
        let tooltipText = params[0].axisValueLabel + '<br/>';
        params.forEach(item => {
          if (item.seriesName === '设备在线率') {
            tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}: ${item.value}%<br/>`;
          } else {
            tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}: ${item.value}<br/>`;
          }
        });
        return tooltipText;
      }
    },
    legend: {
      show: true,
      top: 'top',
      textStyle: {
        color: '#ffffff'
      },
      data: ['告警次数', '设备在线率', '故障设备数']
    }
  };

  myChart.setOption(option);

  // 可选：监听窗口 resize，让图表自适应
  window.addEventListener('resize', () => {
    myChart.resize();
  });
});

// 高亮对应日期的柱子
const highlightBar = (date) => {
  if (!myChart) return;

  // 获取日期索引
  const dateIndex = ['10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04'].indexOf(date);

  if (dateIndex !== -1) {
    myChart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: dateIndex
    });

    // 可选：改变柱子颜色
    myChart.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      dataIndex: dateIndex
    });
  }
};

// 重置柱子高亮
const resetBarHighlight = () => {
  if (!myChart) return;

  myChart.dispatchAction({
    type: 'hideTip'
  });

  myChart.dispatchAction({
    type: 'downplay'
  });
};

// 选择行
const selectRow = (index) => {
  selectedRowIndex.value = index;
};
watch(
  () => moduleStore.currentModule,
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

</script>

<style scoped lang="scss">
.alarm-details-container {
  height: 250px; // 固定高度
  overflow: hidden;
  backdrop-filter: blur(10px);
  margin-left: 10px;
  margin-right: 10px;
}

.alarm-details {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.table-header {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0; // 防止表头被压缩
}

.table-body {
  flex: 1;
  overflow-y: auto; // 垂直滚动条
  overflow-x: hidden; // 防止水平滚动
}

// 自定义滚动条样式
.table-body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.table-row {
  display: flex;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background: rgba(25, 35, 70, 0.8);
    transform: translateX(5px);
  }

  &.selected {
    background: rgba(64, 158, 255, 0.3);
    border-left: 3px solid #409EFF;

    .table-cell {
      color: #409EFF;
      font-weight: bold;
    }
  }

  &:last-child {
    border-bottom: none;
  }
}

.table-cell {
  flex: 1;
  padding: 6px 4px;
  color: #ffffff;
  font-size: 12px;
  text-align: left;
  white-space: nowrap; // 防止换行
  overflow: hidden;
  text-overflow: ellipsis; // 超出显示省略号

  &:first-child {
    flex: 0.8;
  }

  &:nth-child(2) {
    flex: 1.2;
  }

  &:nth-child(3) {
    flex: 1.5;
  }

  &:last-child {
    flex: 2;
  }
}

.table-header .table-cell {
  font-weight: bold;
  color: #b3c7e6;
}
</style>