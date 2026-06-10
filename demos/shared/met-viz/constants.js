/** MetViz Demo 产品列表 */
export const MET_PRODUCTS = [
  { id: 'temperature', label: '温度' },
  { id: 'wind', label: '风速' },
  { id: 'precipitation', label: '降水' },
  { id: 'visibility', label: '能见度' },
  { id: 'humidity', label: '湿度' },
  { id: 'cloud', label: '云量' },
  { id: 'pressure', label: '气压' },
];

export const HEIGHT_LEVELS_M = [100, 300, 500, 1000, 2000];

/** R_met / 风险填色：蓝→绿→黄→橙→红 */
export const R_MET_COLOR_GRADIENT = {
  '0.0': 'rgba(29, 78, 216, 0)',
  '0.25': '#1d4ed8',
  '0.45': '#22c55e',
  '0.65': '#facc15',
  '0.82': '#fb923c',
  '0.96': '#ef4444',
};

/** 标量气象产品填色 */
export const MET_SCALAR_GRADIENT = {
  '0.0': 'rgba(30, 64, 175, 0.15)',
  '0.35': '#3b82f6',
  '0.55': '#22c55e',
  '0.75': '#facc15',
  '1.0': '#ef4444',
};

export const PRODUCT_LABELS = Object.fromEntries(MET_PRODUCTS.map((p) => [p.id, p.label]));

/** 阶段 B 格点贴图支持的产品 */
export { IMAGERY_PRODUCTS, PRODUCT_COLORMAPS, getColormap } from './core/colormaps';

/** Ventusky 风格：白色半透明流线、慢速飘动；domain 由 wind.js 按实况覆盖 */
export const MET_VIZ_WIND_OPTIONS = {
  particlesTextureSize: 96,
  lineWidth: { min: 0.2, max: 0.65 },
  lineLength: { min: 16, max: 28 },
  speedFactor: 0.22,
  dropRate: 0.003,
  dropRateBump: 0.0015,
  colors: [
    'rgba(255,255,255,0.14)',
    'rgba(255,255,255,0.32)',
    'rgba(255,255,255,0.52)',
    'rgba(255,255,255,0.78)',
  ],
  flipY: true,
  useViewerBounds: false,
  dynamic: true,
  domain: { min: 0, max: 15 },
  displayRange: { min: 0, max: 15 },
};
