import { defineStore } from 'pinia';

export const useDashboardWeatherStore = defineStore('dashboardWeather', {
  state: () => ({
    realTimeWeatherPanelData: null,
    weatherForecastPanelData:null,
    flightSuitableAnalysisPanelData:null,
    riskWarningsData:null,
    surveillanceFootageData:null
  }),

  

  actions: {
    setRealTimeWeatherPanelData(data) {
      this.realTimeWeatherPanelData = data;
    },
    setWeatherForecastPanelData(data) {
      this.weatherForecastPanelData = data;
    },
    setFlightSuitableAnalysisPanelData(data) {
      this.flightSuitableAnalysisPanelData = data;
    },
    setRiskWarningsData(data) {
      this.riskWarningsData = data;
    },
    setSurveillanceFootageData(data) {
      this.surveillanceFootageData = data;
    },
    getRealTimeWeatherPanelData() {
      return this.realTimeWeatherPanelData;
    },
    getWeatherForecastPanelData() {
      return this.weatherForecastPanelData;
    },
    getFlightSuitableAnalysisPanelData() {
      return this.flightSuitableAnalysisPanelData;
    },
    getRiskWarningsData() {
      return this.riskWarningsData;
    },
    getSurveillanceFootageData() {
      return this.surveillanceFootageData;
    },
  }
});