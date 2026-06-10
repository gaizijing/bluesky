<template>
  <div class="three-hour-forecast">
    
    <div class="forecast-container">
      <div 
        v-for="(time, index) in weatherForecastPanelData?.time" 
        :key="index"
        class="forecast-item"
      >
        <div class="time">{{ time }}</div>
        <div class="weather-icon">
          <component :is="getWeatherIcon(weatherForecastPanelData.weather_text[index])" size="24" />
        </div>
        <div class="weather-desc">{{ weatherForecastPanelData.weather_text[index] }}</div>
        <div class="temperature">{{ weatherForecastPanelData.temperature_2m[index] }}°C</div>
        <div class="visibility">{{ weatherForecastPanelData.visibility[index] }}m</div>
        <div class="wind-speed">{{ weatherForecastPanelData.wind_speed_10m[index] }}m/s</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";
import { Sunny, Cloudy, Pouring, Lightning, Cloudy as CloudyIcon } from "@element-plus/icons-vue";

const dashboardWeatherStore = useDashboardWeatherStore();

// 天气描述到Element Plus图标的映射
const weatherIconMap = {
  '晴天': Sunny,
  '多云': Cloudy,
  '阴天': CloudyIcon,
  '小雨': Pouring,
  '中雨': Pouring,
  '大雨': Pouring,
  '雷阵雨': Lightning,
  '雪': Cloudy,
  '雾': Cloudy,
  '霾': Cloudy
};

// 从store中获取数据
const weatherForecastPanelData = computed(() => {
  return dashboardWeatherStore.weatherForecastPanelData;
});


// 根据天气描述获取Element Plus图标
const getWeatherIcon = (desc) => {
  return weatherIconMap[desc] || Sunny;
};

</script>

<style scoped>
.three-hour-forecast {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.forecast-container {
  flex: 1 1 auto;
  min-height: 0;
  width: 98%;
  display: flex;
  justify-content: space-between;
  overflow-x: auto;
  gap: 5px;
  padding-bottom: 8px;
  overflow:hidden
}

.forecast-item {
  flex: 0 0 auto;
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s;
}

.forecast-item:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.time {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.weather-icon {
  width: 32px;
  height: 32px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fbbf24;
}

.weather-desc {
  font-size: 11px;
  color: #e2e8f0;
  margin-bottom: 4px;
  text-align: center;
}

.temperature {
  font-size: 13px;
  font-weight: 500;
  color: #fbbf24;
  margin-bottom: 4px;
}

.visibility {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.wind-speed {
  font-size: 11px;
  color: #22c55e;
}

/* 滚动条样式 */
.forecast-container::-webkit-scrollbar {
  height: 4px;
}

.forecast-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.forecast-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 2px;
}

.forecast-container::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.8);
}

@media (max-width: 768px) {
  .forecast-item {
    width: 50px;
    padding: 6px 2px;
  }
  
  .time {
    font-size: 11px;
  }
  
  .weather-icon {
    width: 28px;
    height: 28px;
  }
  
  .weather-desc {
    font-size: 10px;
  }
  
  .temperature {
    font-size: 12px;
  }
  
  .visibility {
    font-size: 10px;
  }
  
  .wind-speed {
    font-size: 10px;
  }
}
</style>
