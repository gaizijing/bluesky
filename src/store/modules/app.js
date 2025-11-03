import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 主题设置
    themeColor: 'blue', // 主题颜色：blue/dark/light
    panelOpacity: 0.7, // 面板透明度
    fontSize: 'medium', // 字体大小：small/medium/large

    // 数据设置
    refreshInterval: 60, // 自动刷新频率（秒），0表示关闭
    enableCache: true, // 是否启用数据缓存
    dataPrecision: 'medium', // 数据精度：low/medium/high

    // 布局设置
    sidebarCollapse: false, // 侧边栏是否折叠
    fullscreen: false // 是否全屏
  }),

  actions: {
    // 设置主题
    setTheme(themeConfig) {
      this.themeColor = themeConfig.themeColor || this.themeColor
      this.panelOpacity = themeConfig.panelOpacity || this.panelOpacity
      this.fontSize = themeConfig.fontSize || this.fontSize
      // 实际项目中可在此处动态修改全局样式变量
    },

    // 设置数据配置
    setDataConfig(dataConfig) {
      this.refreshInterval = dataConfig.refreshInterval || this.refreshInterval
      this.enableCache = dataConfig.enableCache !== undefined ? dataConfig.enableCache : this.enableCache
      this.dataPrecision = dataConfig.dataPrecision || this.dataPrecision
    },

    // 切换侧边栏折叠状态
    toggleSidebar() {
      this.sidebarCollapse = !this.sidebarCollapse
    },

    // 切换全屏状态
    toggleFullscreen() {
      this.fullscreen = !this.fullscreen
      if (this.fullscreen) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }
  }
})