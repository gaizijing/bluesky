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
    particlesTextureSize: 100,  // 粒子数量
    particleHeight: 150,        // 粒子高度
    lineWidth: { min: 0.8, max: 1 },  // 线宽
    lineLength: { min: 10, max: 20 },  // 线长
    speedFactor: 0.6,           // 速度因子
    dropRate: 0.003,            // 粒子消失率
    dropRateBump: 0.0005,       // 粒子重置率
    colors: ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'],
    flipY: true,
    useViewerBounds: false,
    dynamic: true,
    domain: {
      min: 0,
      max: 10                  
    }
};

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

/**
 * 验证风场配置参数，确保符合WindLayerOptions接口规范
 * @param {Object} options - 风场配置选项
 * @returns {Object} 验证并标准化后的配置
 */
export const validateWindOptions = (options) => {
  const validated = { ...WIND_LAYER_DEFAULTS, ...options };
  
  // 数值范围验证
  validated.particlesTextureSize = Math.max(50, Math.min(500, validated.particlesTextureSize));
  validated.particleHeight = Math.max(0, Math.min(10000, validated.particleHeight));
  validated.speedFactor = Math.max(0.1, Math.min(10, validated.speedFactor));
  validated.dropRate = Math.max(0, Math.min(1, validated.dropRate));
  validated.dropRateBump = Math.max(0, Math.min(1, validated.dropRateBump));
  
  // 验证线宽配置
  if (validated.lineWidth && typeof validated.lineWidth === 'object') {
    validated.lineWidth.min = Math.max(0.1, Math.min(10, validated.lineWidth.min));
    validated.lineWidth.max = Math.max(validated.lineWidth.min, Math.min(10, validated.lineWidth.max));
  } else {
    validated.lineWidth = WIND_LAYER_DEFAULTS.lineWidth;
  }
  
  // 验证线长配置
  if (validated.lineLength && typeof validated.lineLength === 'object') {
    validated.lineLength.min = Math.max(5, Math.min(500, validated.lineLength.min));
    validated.lineLength.max = Math.max(validated.lineLength.min, Math.min(500, validated.lineLength.max));
  } else {
    validated.lineLength = WIND_LAYER_DEFAULTS.lineLength;
  }
  
  // 验证颜色数组
  if (!Array.isArray(validated.colors) || validated.colors.length === 0) {
    validated.colors = WIND_LAYER_DEFAULTS.colors;
  }
  
  // 验证domain配置
  if (validated.domain && typeof validated.domain === 'object') {
    if (validated.domain.min !== undefined) {
      validated.domain.min = Math.max(0, validated.domain.min);
    }
    if (validated.domain.max !== undefined) {
      validated.domain.max = Math.max(validated.domain.min || 0, validated.domain.max);
    }
  }
  
  // 验证displayRange配置
  if (validated.displayRange && typeof validated.displayRange === 'object') {
    if (validated.displayRange.min !== undefined) {
      validated.displayRange.min = Math.max(0, validated.displayRange.min);
    }
    if (validated.displayRange.max !== undefined) {
      validated.displayRange.max = Math.max(validated.displayRange.min || 0, validated.displayRange.max);
    }
  }
  
  return validated;
};

/**
 * 获取标准化的风场配置
 * @param {Object} options - 自定义配置选项
 * @returns {Object} 标准化后的风场配置
 */
export const getWindLayerOptions = (options = {}) => {
  return validateWindOptions(options);
};