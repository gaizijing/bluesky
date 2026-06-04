import { fetchCurrentPointWeather } from '@/api'
import { useWeatherStore } from '@/store/modules/weather'
import { useHeatmapStore } from '@/store/modules/heatmap'

class WeatherService {
  constructor() {}

  getWeatherStore() {
    return useWeatherStore()
  }

  getHeatmapStore() {
    return useHeatmapStore()
  }

  async loadAreaWeatherData(area) {
    const weatherStore = this.getWeatherStore()

    try {
      if (!area?.id) {
        weatherStore.setCurrentAreaWeather(null)
        throw new Error('未提供有效的区域信息')
      }

      weatherStore.setIsLoading(true)

      const weatherData = await fetchCurrentPointWeather(area.id)
      weatherStore.setCurrentAreaWeather(weatherData)

      return weatherData
    } catch (error) {
      weatherStore.setCurrentAreaWeather(null)
      console.error('加载区域天气数据失败:', error)
      throw error
    } finally {
      weatherStore.setIsLoading(false)
    }
  }

}

export { WeatherService }
