/** Ventusky 风格色标：固定物理量范围，避免每帧 min/max 跳动 */

/** @typedef {{ stop: number, color: string }} ColorStop */

/** @type {Record<string, { vmin: number, vmax: number, unit: string, stops: ColorStop[] }>} */
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
};

export const IMAGERY_PRODUCTS = [
  'temperature',
  'wind',
  'visibility',
  'precipitation',
  'humidity',
  'cloud',
  'pressure',
];

export function getColormap(product) {
  const key = product === 'precipitation' ? 'precip' : product;
  return PRODUCT_COLORMAPS[key] || PRODUCT_COLORMAPS.temperature;
}

export function isImageryProduct(product) {
  const key = product === 'precip' ? 'precipitation' : product;
  return IMAGERY_PRODUCTS.includes(key);
}

/**
 * @param {number} t 0..1
 * @param {ColorStop[]} stops
 */
export function sampleColormap(t, stops) {
  const clamped = Math.max(0, Math.min(1, t));
  if (!stops?.length) return [0, 0, 0, 0];
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
        ca[3] + (cb[3] - ca[3]) * u,
      ];
    }
  }
  return parseColor(stops[stops.length - 1].color);
}

/** @returns {[number, number, number, number]} */
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

export function valueToNormalized(value, colormap) {
  const { vmin, vmax } = colormap;
  if (!Number.isFinite(value)) return NaN;
  return (value - vmin) / (vmax - vmin || 1);
}
