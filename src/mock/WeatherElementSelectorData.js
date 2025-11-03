// src/components/business/WeatherElementSelector/data.js

// 常规气象选项数据
export const DEFAULT_COMMON_OPTIONS = [
  { label: '温度', value: 'temperature' },
  { label: '湿度', value: 'humidity' },
  { label: '风速', value: 'windSpeed' },
  { label: '降水', value: 'precipitation' },
  { label: '气压', value: 'pressure' },
  { label: '降雪', value: 'snowfall' },
  { label: '云量', value: 'cloud' },
  { label: '能见度', value: 'visibility' }
];

// 精细化气象选项数据
export const DEFAULT_FINE_OPTIONS = [
  { label: '分钟级降雨', value: 'Minute-rainfall' },
  { label: '街区风场模拟', value: 'CFD' }
];

export const DEFAULT_OPTIONS = {
  common: DEFAULT_COMMON_OPTIONS,
  fine: DEFAULT_FINE_OPTIONS
};

export default DEFAULT_OPTIONS;