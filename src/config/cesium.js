import { BASE_LAYER_TYPES } from './constants'
import * as Cesium from 'cesium'

// Cesium全局配置
export const CESIUM_CONFIG = {
  // 1. 初始视角（中国区域）
  initialView: {
        destination: Cesium.Cartesian3.fromDegrees(120.3729295481860, 35.98452399457502, 10000), // 崂山默认视角
        orientation: {
         heading: Cesium.Math.toRadians(3.003064151986261),
          pitch: Cesium.Math.toRadians(-19.956092932734972),
          roll: Cesium.Math.toRadians(0.000034138867324716554)
        }
      },

  // 2. 基础图层配置（与BASE_LAYER_TYPES对应）
  layers: {
    baseLayer: {
      [BASE_LAYER_TYPES.OSM]: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        name: 'OpenStreetMap',
        credit: '© OpenStreetMap contributors'
      },
      [BASE_LAYER_TYPES.SATELLITE]: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        name: 'Satellite',
        credit: '© Esri'
      },
      [BASE_LAYER_TYPES.TERRAIN]: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        name: 'Terrain',
        credit: '© OpenTopoMap'
      }
    },

    // 3. 气象图层默认配置
    weatherLayers: {
      temperature: {
        name: 'temperature',
        visible: false,
        zIndex: 10 // 图层层级（越高越靠上）
      },
      precipitation: {
        name: 'precipitation',
        visible: false,
        zIndex: 20
      },
      wind: {
        name: 'wind',
        visible: false,
        zIndex: 30
      },
      pressure: {
        name: 'pressure',
        visible: false,
        zIndex: 40
      }
    }
  },

  // 4. 气象可视化默认参数
  weatherVisualization: {
    // 温度图层
    temperature: {
      min: -40,    // 最低温度（℃）
      max: 50,     // 最高温度（℃）
      colorMap: [  // 颜色映射
        { value: -40, color: [0, 0, 128] },  // 深蓝
        { value: -20, color: [0, 0, 255] },  // 蓝
        { value: 0, color: [0, 255, 255] },  // 青
        { value: 20, color: [0, 255, 0] },   // 绿
        { value: 30, color: [255, 255, 0] }, // 黄
        { value: 40, color: [255, 165, 0] }, // 橙
        { value: 50, color: [255, 0, 0] }    // 红
      ]
    },

    // 降水图层
    precipitation: {
      min: 0,      // 最小降水量（mm）
      max: 200,    // 最大降水量（mm）
      particleSize: 3, // 粒子大小
      particleSpeed: 150 // 粒子下落速度
    },

    // 风力图层
    wind: {
      min: 0,      // 最小风速（m/s）
      max: 30,     // 最大风速（m/s）
      lineWidth: 3, // 流线宽度
      lineOpacity: 0.8 // 流线透明度
    }
  }
}