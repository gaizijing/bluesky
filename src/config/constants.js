// 1. 气象要素类型枚举（与store/weather.js对应）
export const WEATHER_ELEMENTS = {
  TEMPERATURE: 'temperature',  // 温度（℃）
  PRECIPITATION: 'precipitation', // 降水（mm）
  WIND: 'wind',                // 风力（m/s）
  PRESSURE: 'pressure',        // 气压（hPa）
  HUMIDITY: 'humidity',        // 湿度（%）
  CLOUD: 'cloud'               // 云量（%）
}

// 2. 气象要素中文标签映射
export const WEATHER_ELEMENT_LABELS = {
  [WEATHER_ELEMENTS.TEMPERATURE]: '温度',
  [WEATHER_ELEMENTS.PRECIPITATION]: '降水',
  [WEATHER_ELEMENTS.WIND]: '风力',
  [WEATHER_ELEMENTS.PRESSURE]: '气压',
  [WEATHER_ELEMENTS.HUMIDITY]: '湿度',
  [WEATHER_ELEMENTS.CLOUD]: '云量'
}

// 3. 气象要素单位映射
export const WEATHER_ELEMENT_UNITS = {
  [WEATHER_ELEMENTS.TEMPERATURE]: '℃',
  [WEATHER_ELEMENTS.PRECIPITATION]: 'mm',
  [WEATHER_ELEMENTS.WIND]: 'm/s',
  [WEATHER_ELEMENTS.PRESSURE]: 'hPa',
  [WEATHER_ELEMENTS.HUMIDITY]: '%',
  [WEATHER_ELEMENTS.CLOUD]: '%'
}

// 4. 时间范围选项（与TimeRangeSelector组件对应）
export const TIME_RANGE_OPTIONS = [
  { label: '过去24小时', value: '24h' },
  { label: '过去7天', value: '7d' },
  { label: '过去30天', value: '30d' },
  { label: '自定义', value: 'custom' }
]

// 5. 全局颜色常量（与styles/variables.scss对应）
export const COLORS = {
  PRIMARY: '#165DFF',          // 主色（蓝）
  SUCCESS: '#00B42A',          // 成功色（绿）
  WARNING: '#FF7D00',          // 警告色（橙）
  DANGER: '#F53F3F',           // 危险色（红）
  INFO: '#86909C',             // 信息色（灰）
  BACKGROUND: '#0F1733',       // 大屏背景色（深蓝黑）
  PANEL_BACKGROUND: 'rgba(15, 23, 51, 0.7)', // 面板背景（半透明）
  BORDER: 'rgba(34, 101, 255, 0.3)', // 边框色（蓝灰）
  TEXT_LIGHT: '#FFFFFF',       // 浅色文本（白）
  TEXT_DARK: '#1D2129'         // 深色文本（黑）
}

// 6. 布局常量（与styles/variables.scss对应）
export const LAYOUT = {
  HEADER_HEIGHT: '60px',       // 头部高度
  SIDEBAR_WIDTH: '260px',      // 侧边栏宽度
  FOOTER_HEIGHT: '40px',       // 底部高度
  PANEL_MARGIN: '10px',        // 面板间距
  PANEL_PADDING: '15px',       // 面板内边距
  GAP_SMALL: '8px',            // 小间距
  GAP_MEDIUM: '16px',          // 中间距
  GAP_LARGE: '24px'            // 大间距
}

// 7. 气象预警等级
export const WEATHER_ALERT_LEVELS = {
  BLUE: 'blue',    // 蓝色预警
  YELLOW: 'yellow',// 黄色预警
  ORANGE: 'orange',// 橙色预警
  RED: 'red'       // 红色预警
}

// 8. 基础图层类型
export const BASE_LAYER_TYPES = {
  OSM: 'osm',                  // OpenStreetMap（街道）
  SATELLITE: 'satellite',      // 卫星地图
  TERRAIN: 'terrain'           // 地形地图
}


// src/constants/dashboardModules.js
export const DASHBOARD_MODULES = {
  DEVICE_MONITOR: 'deviceMonitor',
  REGION_MONITOR: 'regionMonitor',
  FLIGHT_ANALYSIS: 'flightAnalysis',
  LANDING_MONITOR: 'mapController'

};
export const MODULE_LIST = [
  {
    key: DASHBOARD_MODULES.DEVICE_MONITOR,
    name: "设备监测",
  },
  {
    key: DASHBOARD_MODULES.LANDING_MONITOR,
    name: "低空气象态势",
  },
  // {
  //   key: DASHBOARD_MODULES.REGION_MONITOR,
  //   name: "空域气象",
  // },

  {
    key: DASHBOARD_MODULES.FLIGHT_ANALYSIS,
    name: "飞行分析",
  },
  
];