import { defineStore } from 'pinia'
import { WEATHER_ELEMENTS } from '@/config/constants'

// 气象数据状态管理
export const useWeatherStore = defineStore('weather', {
  state: () => ({
   
    // 当前重点关注区域的实时天气数据
    currentPointWeather: null,
    isLoading: false,
  }),
  getters: {
    // 获取Header组件需要的天气信息
    headerWeatherInfo(state) {
      // 适配API返回的数据格式
      const weatherData = state.currentPointWeather
      
      return {
        temperature: weatherData.temp + '°C',
        windSpeed: weatherData.windSpeed + 'm/s',
        visibility: weatherData.vis + 'km',
        humidity: weatherData.humidity + '%'
      }
    }
  },
  actions: {
    setIsLoading(isLoading) {
      this.isLoading = isLoading;
    },
    
   
    // 设置当前重点关注区域的实时天气数据
    setCurrentAreaWeather(weatherData) {
      this.currentPointWeather = weatherData
    }
  }
})