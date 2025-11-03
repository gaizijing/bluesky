<!-- src/components/business/EquipmentAlarm/index.vue -->
<template>
  <div>
    <div class="panel-header">
      <span class="panel-title">近七日设备报警情况</span>
    </div>
    <div ref="chart" style="width: 100%; height: 180px;"></div>
    
    <!-- 报警详情表格 -->
    <div class="alarm-details-container">
      <div class="alarm-details">
        <div class="table-header">
          <div class="table-cell">设备类型</div>
          <div class="table-cell">设备名称</div>
          <div class="table-cell">报警内容</div>
          <div class="table-cell">报警时间</div>
        </div>
        <div class="table-body">
          <div 
            class="table-row"
            v-for="(item, index) in alarmDetails"
            :key="index"
            @mouseenter="highlightBar(item.date)"
            @mouseleave="resetBarHighlight"
            @click="selectRow(index)"
            :class="{ selected: selectedRowIndex === index }"
          >
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
import { ref, onMounted } from 'vue';
// 导入 ECharts
import * as echarts from 'echarts';

const chart = ref(null); // 绑定 DOM 容器
let myChart = null;
const selectedRowIndex = ref(-1); // 当前选中的行索引

// 报警详情数据
const alarmDetails = ref([
  { date: '10-29', deviceType: '气象站', deviceName: '自动气象站01', alarmContent: '风速超限', alarmTime: '2023-10-29 08:30:15' },
  { date: '10-29', deviceType: '雷达', deviceName: '小型天气雷达', alarmContent: '信号异常', alarmTime: '2023-10-29 14:22:45' },
  { date: '10-30', deviceType: '激光雷达', deviceName: '测风雷达02', alarmContent: '数据缺失', alarmTime: '2023-10-30 09:15:30' },
  { date: '10-31', deviceType: '气象站', deviceName: '自动气象站03', alarmContent: '温度传感器故障', alarmTime: '2023-10-31 11:45:20' },
  { date: '10-31', deviceType: '激光雷达', deviceName: '三维激光雷达', alarmContent: '电源波动', alarmTime: '2023-10-31 16:10:05' },
  { date: '10-31', deviceType: '气象站', deviceName: '自动气象站02', alarmContent: '湿度超限', alarmTime: '2023-10-31 18:55:40' },
  { date: '11-01', deviceType: '雷达', deviceName: '小型天气雷达', alarmContent: '天线故障', alarmTime: '2023-11-01 07:20:10' },
  { date: '11-02', deviceType: '激光雷达', deviceName: '测风雷达01', alarmContent: '通信中断', alarmTime: '2023-11-02 13:35:55' },
  { date: '11-03', deviceType: '气象站', deviceName: '自动气象站01', alarmContent: '气压异常', alarmTime: '2023-11-03 10:40:25' },
  { date: '11-04', deviceType: '激光雷达', deviceName: '三维激光雷达', alarmContent: '激光器温度过高', alarmTime: '2023-11-04 15:15:35' },
  { date: '11-04', deviceType: '气象站', deviceName: '自动气象站04', alarmContent: '降水传感器堵塞', alarmTime: '2023-11-04 17:30:50' },
  { date: '11-04', deviceType: '气象站', deviceName: '自动气象站05', alarmContent: '风向传感器异常', alarmTime: '2023-11-04 19:45:12' },
  { date: '11-04', deviceType: '激光雷达', deviceName: '测风雷达03', alarmContent: '激光功率下降', alarmTime: '2023-11-04 21:30:45' }
]);

// 组件挂载后初始化图表（确保 DOM 已存在）
onMounted(() => {
  // 初始化图表
  myChart = echarts.init(chart.value);
  
  // 配置图表选项
  const option = {
    xAxis: {
      type: 'category',
      data: ['10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04'], // 更实际的日期
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
    yAxis: {
      type: 'value',
      axisLine: {
        show: true, // 显示Y轴线
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
      },
      splitLine: {
        show: false // 取消横向分割线
      }
    },
    series: [
      {
        data: [3, 1, 3, 1, 1, 1, 3], // 对应报警详情数据的统计
        type: 'bar',
        barWidth: '30%', // 调整柱子宽度
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#3dd1ffba' }, // 上部颜色
              { offset: 1, color: '#3dd1ff52' }  // 下部颜色
            ]
          },
          borderRadius: [4, 4, 0, 0] // 柱子顶部圆角
        },
        barGap: '50%', // 柱子之间的间距
        barCategoryGap: '30%', // 类别之间的间距
        label: { // 修正属性名：label 而不是 Label
          show: true,
          position: 'top',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 'bold'
        }
      }
    ],
    grid: {
      left: '3%',
      right: '3%',
      top: '20%',
      bottom: '0%',
      containLabel: true
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
</script>

<style scoped lang="scss">


.alarm-details-container {
  height: 120px; // 固定高度
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
    flex: 1.2;
  }
}

.table-header .table-cell {
  font-weight: bold;
  color: #b3c7e6;
}
</style>