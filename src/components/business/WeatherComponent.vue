<template>
  <div class="weather-component" @mouseenter="showWeatherDetail = true" @mouseleave="showWeatherDetail = false">
    <!-- 天气信息显示 -->
    <div class="weather-info">
      <div class="weather-item">
        <div class="weather-icon-circle">
          <img src="@/assets/icons/ic_temperature.png" class="weather-icon" />
        </div>
        <span class="weather-value">{{ weatherStore.headerWeatherInfo.temperature }}</span>
      </div>
      <div class="weather-item">
        <div class="weather-icon-circle">
          <img src="@/assets/icons/ic_windspeed.png" class="weather-icon" />
        </div>
        <span class="weather-value">{{ weatherStore.headerWeatherInfo.windSpeed }}</span>
      </div>
      <div class="weather-item">
        <div class="weather-icon-circle">
          <img src="@/assets/icons/ic_visibility.png" class="weather-icon" />
        </div>
        <span class="weather-value">{{ weatherStore.headerWeatherInfo.visibility }}</span>
      </div>
      <div class="weather-item">
        <div class="weather-icon-circle">
          <img src="@/assets/icons/ic_humidity.png" class="weather-icon" />
        </div>
        <span class="weather-value">{{ weatherStore.headerWeatherInfo.humidity }}</span>
      </div>
    </div>

    <!-- 详细天气弹窗 -->
    <div v-if="showWeatherDetail" class="weather-detail-popup" @mouseenter="showWeatherDetail = true" @mouseleave="showWeatherDetail = false">
      <div class="weather-detail-container">
        <div class="weather-detail-header">
          <div class="weather-main-info">
            <div class="temperature">{{ weatherStore.currentPointWeather?.temp || '--' }}℃</div>
            <div class="weather-status">{{ weatherStore.currentPointWeather?.text || '暂无数据' }}</div>
          </div>
          <div class="weather-date-info">
            <div class="date">{{ currentDate }}</div>
            <div class="location">{{ areaStore.selectedAreaName }}</div>
          </div>
        </div>
        <div class="weather-detail-content">
          <div class="weather-item">
            <div class="weather-item-label">风速</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather?.windSpeed || '--' }}</div>
            <div class="weather-item-unit">m/s</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">能见度</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather?.vis || '--' }}</div>
            <div class="weather-item-unit">km</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">降水量</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather?.precip || '--' }}</div>
            <div class="weather-item-unit">mm</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">湿度</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather?.humidity || '--' }}</div>
            <div class="weather-item-unit">%</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">气压</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather?.pressure || '--' }}</div>
            <div class="weather-item-unit">hPa</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">风向</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather?.windDir || '--' }}</div>
          </div>
        </div>
        <div class="weather-detail-footer">
          <div class="weather-suggestion">
            <div class="suggestion-title">今日天气状况良好，适宜飞行</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useWeatherStore } from '@/store/modules/weather';
import { useAreaStore } from '@/store/modules/area';
import { useCurrentTime } from '@/hooks/useTime';

const weatherStore = useWeatherStore();
const areaStore = useAreaStore();

const showWeatherDetail = ref(false);

// 当前日期
const currentDate = computed(() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${year}-${month}-${day} ${week}`;
});
</script>

<style scoped lang="scss">
.weather-component {
  position: relative;
  cursor: pointer;
}

/* 天气信息显示 */
.weather-info {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 0 15px;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.weather-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.weather-icon-circle {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(66, 153, 225, 0.8) 0%, rgba(66, 153, 225, 0.3) 100%);
}

.weather-icon {
  width: 20px;
  height: 20px;
}

.weather-value {
  font-size: $font-size-small;
  color: $header-color;
}

/* 详细天气弹窗 */
.weather-detail-popup {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  z-index: 1000;
}

.weather-detail-container {
  width: 350px;
  background-image: url('@/assets/images/bg_weather.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 10px;
  color: #fff;
  padding: 20px;
  font-family: 'AideepFont';
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.weather-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.weather-main-info {
  text-align: left;
}

.temperature {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 5px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.weather-status {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
}

.weather-date-info {
  text-align: right;
}

.date {
  font-size: 16px;
  margin-bottom: 5px;
}

.location {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.weather-detail-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.weather-item-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 5px;
}

.weather-item-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 3px;
}

.weather-item-unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.weather-detail-footer {
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.weather-suggestion {
  text-align: center;
}

.suggestion-title {
  font-size: 14px;
  color: #4CAF50;
  font-weight: bold;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .weather-info {
    gap: 8px;
    padding: 0 10px;
  }

  .weather-icon {
    width: 16px;
    height: 16px;
  }

  .weather-value {
    font-size: 12px;
  }

  .weather-detail-container {
    width: 300px;
    right: 0;
  }

  .temperature {
    font-size: 36px;
  }

  .weather-detail-content {
    grid-template-columns: 1fr;
  }
}
</style>