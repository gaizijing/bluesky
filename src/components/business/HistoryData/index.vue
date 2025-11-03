<template>
  <div>
    <div class="panel-header">
      <span class="panel-title">历史12h实况监测数据</span>
    </div>
    <div class="container">
      <div class="title-panel">
        <div class="title">监测数据</div>
      </div>
      
      <!-- 地点选择器 -->
      <div class="location-selector">
        <el-select 
          v-model="selectedLocation" 
          placeholder="请选择地点" 
          @change="handleLocationChange"
          size="small"
        >
          <el-option
            v-for="location in locations"
            :key="location.id"
            :label="location.name"
            :value="location.id"
          />
        </el-select>
      </div>
      
      <!-- 折线图容器 -->
      <div ref="chartContainer" class="chart-container"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'HistoryData',
  data() {
    return {
      selectedLocation: '', // 当前选中的地点
      locations: [
        { id: 'loc1', name: '观测点A' },
        { id: 'loc2', name: '观测点B' },
        { id: 'loc3', name: '观测点C' }
      ],
      // 模拟各地点的历史数据
      locationData: {
        loc1: [
          { time: '00:00', value: 12 },
          { time: '01:00', value: 13 },
          { time: '02:00', value: 14 },
          { time: '03:00', value: 15 },
          { time: '04:00', value: 16 },
          { time: '05:00', value: 17 },
          { time: '06:00', value: 18 },
          { time: '07:00', value: 19 },
          { time: '08:00', value: 20 },
          { time: '09:00', value: 21 },
          { time: '10:00', value: 22 },
          { time: '11:00', value: 23 }
        ],
        loc2: [
          { time: '00:00', value: 8 },
          { time: '01:00', value: 9 },
          { time: '02:00', value: 10 },
          { time: '03:00', value: 11 },
          { time: '04:00', value: 12 },
          { time: '05:00', value: 13 },
          { time: '06:00', value: 14 },
          { time: '07:00', value: 15 },
          { time: '08:00', value: 16 },
          { time: '09:00', value: 17 },
          { time: '10:00', value: 18 },
          { time: '11:00', value: 19 }
        ],
        loc3: [
          { time: '00:00', value: 15 },
          { time: '01:00', value: 16 },
          { time: '02:00', value: 17 },
          { time: '03:00', value: 18 },
          { time: '04:00', value: 19 },
          { time: '05:00', value: 20 },
          { time: '06:00', value: 21 },
          { time: '07:00', value: 22 },
          { time: '08:00', value: 23 },
          { time: '09:00', value: 24 },
          { time: '10:00', value: 25 },
          { time: '11:00', value: 26 }
        ]
      },
      chart: null // ECharts实例
    };
  },
  mounted() {
    // 初始化图表
    this.initChart();
    
    // 默认选中第一个地点
    if (this.locations.length > 0) {
      this.selectedLocation = this.locations[0].id;
      this.updateChart();
    }
  },
  beforeDestroy() {
    // 销毁图表实例，防止内存泄漏
    if (this.chart) {
      this.chart.dispose();
    }
  },
  methods: {
    // 初始化图表
    initChart() {
      this.chart = echarts.init(this.$refs.chartContainer);
      
      // 监听窗口大小变化，自适应图表
      window.addEventListener('resize', this.handleResize);
    },
    
    // 处理窗口大小变化
    handleResize() {
      if (this.chart) {
        this.chart.resize();
      }
    },
    
    // 地点选择变更处理
    handleLocationChange(locationId) {
      this.updateChart();
    },
    
    // 更新图表数据
    updateChart() {
      if (!this.chart || !this.selectedLocation) return;
      
      const data = this.locationData[this.selectedLocation];
      if (!data) return;
      
      const option = {
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item.time)
        },
        yAxis: {
          type: 'value',
          name: '数值'
        },
        series: [{
          data: data.map(item => item.value),
          type: 'line',
          smooth: true,
          lineStyle: {
            color: '#409EFF'
          },
          itemStyle: {
            color: '#409EFF'
          }
        }]
      };
      
      this.chart.setOption(option, true); // 使用notMerge:true避免选项合并问题
    }
  }
};
</script>

<style scoped lang="scss">
.panel-header {
  margin-bottom: 10px;
}

.panel-title {
  font-size: 16px;
  font-weight: bold;
}

.container {
  position: relative;
  padding-top: 30px;
}

.title-panel {
  background-image: url("@/assets/images/061.png");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: bottom;
  text-align: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 14px;
  z-index: 1;
}

.location-selector {
  margin: 10px 0;
  text-align: center;
}

.chart-container {
  width: 100%;
  height: 300px;
  margin-top: 10px;
}
</style>