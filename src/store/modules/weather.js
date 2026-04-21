import { defineStore } from 'pinia'

const isEmptyWeatherValue = (value) => value === null || value === undefined || value === ''

const formatWeatherMetric = (value, unit = '') => {
  if (isEmptyWeatherValue(value)) {
    return unit ? `--${unit}` : '--'
  }

  return `${value}${unit}`
}

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    currentPointWeather: null,
    isLoading: false
  }),
  getters: {
    headerWeatherInfo(state) {
      const weatherData = state.currentPointWeather || {}

      return {
        temperature: formatWeatherMetric(weatherData.temp, '°C'),
        windSpeed: formatWeatherMetric(weatherData.windSpeed, 'm/s'),
        visibility: formatWeatherMetric(weatherData.vis, 'km'),
        humidity: formatWeatherMetric(weatherData.humidity, '%')
      }
    }
  },
  actions: {
    setIsLoading(isLoading) {
      this.isLoading = isLoading
    },
    setCurrentAreaWeather(weatherData) {
      this.currentPointWeather = weatherData || null
    }
  }
})
