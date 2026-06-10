/** 格点填色色标（与 src/met-viz/core/colormaps.js 对齐） */

export const GRID_PRODUCTS = [
  { id: 'temperature', label: '温度', unit: '°C' },
  { id: 'wind', label: '风速', unit: 'm/s' },
  { id: 'visibility', label: '能见度', unit: 'm' },
  { id: 'precip', label: '降水', unit: 'mm/h' },
  { id: 'humidity', label: '湿度', unit: '%' },
  { id: 'cloud', label: '云量', unit: '%' },
  { id: 'pressure', label: '气压', unit: 'hPa' },
  { id: 'rmet', label: '风险', unit: '风险指数' },
];

export const PRODUCT_COLORMAPS = {
  temperature: {
    vmin: -20,
    vmax: 40,
    unit: '°C',
    stops: [
      { stop: 0, color: '#4c1d95' },
      { stop: 0.12, color: '#1d4ed8' },
      { stop: 0.28, color: '#06b6d4' },
      { stop: 0.42, color: '#22c55e' },
      { stop: 0.55, color: '#eab308' },
      { stop: 0.72, color: '#f97316' },
      { stop: 0.88, color: '#ef4444' },
      { stop: 1, color: '#7f1d1d' },
    ],
  },
  wind: {
    vmin: 0,
    vmax: 25,
    unit: 'm/s',
    stops: [
      { stop: 0, color: '#e0f2fe' },
      { stop: 0.15, color: '#7dd3fc' },
      { stop: 0.35, color: '#22d3ee' },
      { stop: 0.55, color: '#facc15' },
      { stop: 0.75, color: '#f97316' },
      { stop: 1, color: '#dc2626' },
    ],
  },
  visibility: {
    vmin: 0,
    vmax: 20000,
    unit: 'm',
    stops: [
      { stop: 0, color: '#7f1d1d' },
      { stop: 0.25, color: '#f97316' },
      { stop: 0.5, color: '#eab308' },
      { stop: 0.75, color: '#22c55e' },
      { stop: 1, color: '#dbeafe' },
    ],
  },
  precip: {
    vmin: 0,
    vmax: 15,
    unit: 'mm/h',
    stops: [
      { stop: 0, color: 'rgba(15, 23, 42, 0)' },
      { stop: 0.1, color: '#bfdbfe' },
      { stop: 0.35, color: '#3b82f6' },
      { stop: 0.6, color: '#7c3aed' },
      { stop: 0.85, color: '#be185d' },
      { stop: 1, color: '#881337' },
    ],
  },
  humidity: {
    vmin: 0,
    vmax: 100,
    unit: '%',
    stops: [
      { stop: 0, color: '#fef3c7' },
      { stop: 0.35, color: '#86efac' },
      { stop: 0.65, color: '#22d3ee' },
      { stop: 1, color: '#1e3a8a' },
    ],
  },
  cloud: {
    vmin: 0,
    vmax: 100,
    unit: '%',
    stops: [
      { stop: 0, color: 'rgba(15, 23, 42, 0)' },
      { stop: 0.2, color: 'rgba(148, 163, 184, 0.35)' },
      { stop: 0.5, color: 'rgba(100, 116, 139, 0.65)' },
      { stop: 0.8, color: 'rgba(71, 85, 105, 0.85)' },
      { stop: 1, color: 'rgba(30, 41, 59, 0.95)' },
    ],
  },
  pressure: {
    vmin: 980,
    vmax: 1040,
    unit: 'hPa',
    stops: [
      { stop: 0, color: '#7c3aed' },
      { stop: 0.35, color: '#3b82f6' },
      { stop: 0.65, color: '#22c55e' },
      { stop: 1, color: '#f97316' },
    ],
  },
  rmet: {
    vmin: 0,
    vmax: 100,
    unit: '',
    stops: [
      { stop: 0, color: 'rgba(29, 78, 216, 0.05)' },
      { stop: 0.25, color: '#1d4ed8' },
      { stop: 0.45, color: '#22c55e' },
      { stop: 0.65, color: '#facc15' },
      { stop: 0.82, color: '#fb923c' },
      { stop: 0.96, color: '#ef4444' },
      { stop: 1, color: '#7f1d1d' },
    ],
  },
};

export function normalizeProduct(product) {
  const key = String(product || 'temperature').trim().toLowerCase();
  if (key === 'precipitation' || key === 'precip') return 'precip';
  if (key === 'r_met' || key === 'risk' || key === 'rmet') return 'rmet';
  return GRID_PRODUCTS.some((p) => p.id === key) ? key : 'temperature';
}

export function getColormap(product) {
  const key = normalizeProduct(product);
  return PRODUCT_COLORMAPS[key] || PRODUCT_COLORMAPS.temperature;
}

export function getProductMeta(product) {
  const key = normalizeProduct(product);
  return GRID_PRODUCTS.find((p) => p.id === key) || GRID_PRODUCTS[0];
}

function parseColor(css) {
  const s = String(css).trim();
  if (s.startsWith('rgba')) {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 255];
    const p = m[1].split(',').map((x) => Number(x.trim()));
    return [p[0], p[1], p[2], Math.round((p[3] ?? 1) * 255)];
  }
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  return [128, 128, 128, 255];
}

function sampleColormap(t, stops) {
  const clamped = Math.max(0, Math.min(1, t));
  if (!stops?.length) return [0, 0, 0, 255];
  if (clamped <= stops[0].stop) return parseColor(stops[0].color);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (clamped <= b.stop) {
      const span = b.stop - a.stop || 1;
      const u = (clamped - a.stop) / span;
      const ca = parseColor(a.color);
      const cb = parseColor(b.color);
      return [
        Math.round(ca[0] + (cb[0] - ca[0]) * u),
        Math.round(ca[1] + (cb[1] - ca[1]) * u),
        Math.round(ca[2] + (cb[2] - ca[2]) * u),
        Math.round(ca[3] + (cb[3] - ca[3]) * u),
      ];
    }
  }
  return parseColor(stops[stops.length - 1].color);
}

function rgbaToHex([r, g, b]) {
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

/** Kriging plot 用 hex 色带 */
export function buildKrigingColors(product, steps = 64) {
  const colormap = getColormap(product);
  const colors = [];
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(steps - 1, 1);
    colors.push(rgbaToHex(sampleColormap(t, colormap.stops)));
  }
  return { colors, zlim: [colormap.vmin, colormap.vmax], colormap };
}

/** 图例 CSS 渐变 */
export function buildLegendGradient(product) {
  const colormap = getColormap(product);
  const parts = colormap.stops.map((s) => `${s.color} ${Math.round(s.stop * 100)}%`);
  return `linear-gradient(to top, ${parts.join(', ')})`;
}

export function formatLegendValue(value, product) {
  const colormap = getColormap(product);
  if (!Number.isFinite(value)) return '—';
  if (product === 'visibility') {
    return value >= 1000 ? (value / 1000).toFixed(1) + ' km' : Math.round(value) + ' m';
  }
  if (product === 'pressure') return value.toFixed(0) + ' ' + colormap.unit;
  if (product === 'humidity' || product === 'cloud') return value.toFixed(0) + colormap.unit;
  if (product === 'precip') return value.toFixed(1) + ' ' + colormap.unit;
  if (product === 'rmet') return value.toFixed(1);
  return value.toFixed(1) + ' ' + colormap.unit;
}
