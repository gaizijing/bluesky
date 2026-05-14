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
    particlesTextureSize: 200,  // 粒子数量
    particleHeight: 150,        // 粒子高度
    lineWidth: { min: 0, max: 0.5 },  // 线宽
    lineLength: { min:5, max: 10 },  // 线长
    speedFactor: 1,           // 速度因子
    dropRate: 0.003,            // 粒子消失率
    dropRateBump: 0.001,       // 粒子重置率
    colors: ['#050404', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'],
    flipY: true,
    useViewerBounds: false,
    dynamic: true,
    displayRange: {
      min: 0,
      max: 1000
    },
    domain: {
      min: 0,
      max: 30
    }
};
/** 低于此高度（米）视为「低空」：可显示风场等；与 {@link CAMERA_HEIGHT_WIND_OFF_HYSTERESIS_M} 配合避免阈值附近抖动 */
export const CAMERA_HEIGHT_THRESHOLD = 10000
/**
 * 滞回：低空状态下相机需高于 (THRESHOLD + 该值) 才切换为高空逻辑，减少俯仰/地形导致高度在阈值两侧跳变时风场反复开关与粒子重置
 */
export const CAMERA_HEIGHT_WIND_OFF_HYSTERESIS_M = 800
