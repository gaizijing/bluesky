import { defineStore } from 'pinia'
import { WEATHER_ELEMENTS } from '@/config/constants'

// 气象数据状态管理
export const useWeatherStore = defineStore('weather', {
  state: () => ({
    // 当前选中的气象要素（默认温度）
    currentElement: WEATHER_ELEMENTS.TEMPERATURE,
    // 当前时间（默认当前时间ISO格式）
    currentTime: new Date().toISOString(),
    // 时间范围（默认24小时）
    timeRange: '24h',
    // 各气象要素数据存储
    weatherData: {
      [WEATHER_ELEMENTS.TEMPERATURE]: null,
      [WEATHER_ELEMENTS.PRECIPITATION]: null,
      [WEATHER_ELEMENTS.WIND]: null,
      [WEATHER_ELEMENTS.PRESSURE]: null,
      [WEATHER_ELEMENTS.HUMIDITY]: null,
      [WEATHER_ELEMENTS.CLOUD]: null
    },
    // 当前监测点的实时天气数据
    currentPointWeather: null,
    // 统计数据（最大值、最小值、平均值等）
    statistics: {
      max: null,
      min: null,
      average: null,
      trend: 'stable' // stable/up/down
    }
  }),
  getters: {
    // 快捷获取当前气象要素的数据
    currentWeatherData(state) {
      return state.weatherData[state.currentElement] || {}
    },
    // 快捷获取当前气象要素的中文名称
    currentElementLabel(state) {
      const labelMap = {
        [WEATHER_ELEMENTS.TEMPERATURE]: '温度',
        [WEATHER_ELEMENTS.PRECIPITATION]: '降水',
        [WEATHER_ELEMENTS.WIND]: '风力',
        [WEATHER_ELEMENTS.PRESSURE]: '气压',
        [WEATHER_ELEMENTS.HUMIDITY]: '湿度',
        [WEATHER_ELEMENTS.CLOUD]: '云量'
      }
      return labelMap[state.currentElement] || '气象要素'
    },
    // 获取Header组件需要的天气信息
    headerWeatherInfo(state) {      
      if (!state.currentPointWeather) {
        return {
          temperature: '25°C',
          windSpeed: '3.5m/s',
          visibility: '10km',
          humidity: '0mm'
        }
      }
      
      // 适配API返回的数据格式
      const weatherData = state.currentPointWeather
      
      return {
        temperature: weatherData.temperature ? `${weatherData.temperature.value}${weatherData.temperature.unit}` : '25°C',
        windSpeed: weatherData.windSpeed ? `${weatherData.windSpeed.value}${weatherData.windSpeed.unit}` : '3.5m/s',
        // 由于API可能没有返回能见度数据，暂时使用默认值
        visibility:weatherData.visibility ? `${weatherData.visibility.value}${weatherData.visibility.unit}`: '10km',
        // API返回的是relativeHumidity
        humidity: weatherData.relativeHumidity ? `${weatherData.relativeHumidity.value}${weatherData.relativeHumidity.unit}` : '0%'
      }
    }
  },
  actions: {
    // 设置当前气象要素
    setCurrentElement(element) {
      if (Object.values(WEATHER_ELEMENTS).includes(element)) {
        this.currentElement = element
      }
    },
    // 设置当前时间
    setCurrentTime(time) {
      this.currentTime = time || new Date().toISOString()
    },
    // 设置时间范围
    setTimeRange(range) {
      const validRanges = ['24h', '7d', '30d', 'custom']
      if (validRanges.includes(range)) {
        this.timeRange = range
      }
    },
    // 更新指定气象要素的数据
    updateWeatherData(element, data) {
      if (Object.values(WEATHER_ELEMENTS).includes(element)) {
        this.weatherData[element] = data
      }
    },
    // 更新统计数据
    updateStatistics(data) {
      this.statistics = { ...this.statistics, ...data }
    },
    // 设置当前监测点的实时天气数据
    setCurrentPointWeather(weatherData) {
      this.currentPointWeather = weatherData
    },
    
    // 重置所有气象数据
    resetWeatherData() {
      this.weatherData = {
        [WEATHER_ELEMENTS.TEMPERATURE]: null,
        [WEATHER_ELEMENTS.PRECIPITATION]: null,
        [WEATHER_ELEMENTS.WIND]: null,
        [WEATHER_ELEMENTS.PRESSURE]: null,
        [WEATHER_ELEMENTS.HUMIDITY]: null,
        [WEATHER_ELEMENTS.CLOUD]: null
      }
      this.statistics = { max: null, min: null, average: null, trend: 'stable' }
      this.currentPointWeather = null
    }
  }
})