/**
 * 风场图层默认配置
 * 定义WindLayer组件的默认参数选项，符合WindLayerOptions接口规范
 */

/**
 * WindLayerOptions接口定义
 * @typedef {Object} WindLayerOptions
 * @property {number} particlesTextureSize - 粒子纹理大小，决定粒子最大数量（size * size）
 * @property {number} particleHeight - 粒子距地面高度
 * @property {Object} lineWidth - 粒子轨迹宽度范围
 * @property {number} lineWidth.min - 最小线宽
 * @property {number} lineWidth.max - 最大线宽
 * @property {Object} lineLength - 粒子轨迹长度范围
 * @property {number} lineLength.min - 最小线长
 * @property {number} lineLength.max - 最大线长
 * @property {number} speedFactor - 速度倍数
 * @property {number} dropRate - 粒子消失率
 * @property {number} dropRateBump - 额外消失率
 * @property {string[]} colors - 粒子颜色数组
 * @property {boolean} flipY - 是否翻转 Y 坐标
 * @property {boolean} useViewerBounds - 是否使用视域范围生成粒子
 * @property {Object} domain - 速度渲染范围
 * @property {number} domain.min - 最小速度值
 * @property {number} domain.max - 最大速度值
 * @property {Object} displayRange - 速度显示范围
 * @property {number} displayRange.min - 最小速度值
 * @property {number} displayRange.max - 最大速度值
 * @property {boolean} dynamic - 是否启用动态粒子动画
 */

export const WIND_LAYER_DEFAULTS = {
    particlesTextureSize: 50,  // 粒子数量
    //particleHeight: 150,        // 粒子高度
    lineWidth: { min: 0.05, max: 0.08 },  // 线宽
    lineLength: { min:1, max: 1 },  // 线长
    speedFactor: 0.3,           // 速度因子
    dropRate: 0.003,            // 粒子消失率
    dropRateBump: 0.001,       // 粒子重置率
    colors: ['#050404ff', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'],
    flipY: true,
    useViewerBounds: false,
    dynamic: true,
    displayRange: {
      min: 0,
      max: 10                  
    }
};
export const CAMERA_HEIGHT_THRESHOLD = 3000; // Show wind field only when camera is below 500m

// 预定义颜色方案
export const COLOR_SCHEMES = {
  rainbow: ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'],
  jet: ['#000080', '#0000FF', '#00FFFF', '#FFFF00', '#FF0000', '#800000'],
  viridis: ['#440154', '#3B528B', '#21908C', '#5DC863', '#FDE725'],
  white: ['white']
};

/**
 * 获取颜色方案
 * @param {string} scheme - 颜色方案名称
 * @returns {string[]} 颜色数组
 */
export const getColorScheme = (scheme) => {
  return COLOR_SCHEMES[scheme] || COLOR_SCHEMES.rainbow;
};

