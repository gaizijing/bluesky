import { GRID_PRODUCTS, normalizeProduct } from './colormaps.js';

const FALLBACK = {
  heightLevelsM: [100, 300, 500, 1000, 2000],
  gridProducts: ['temperature', 'wind', 'visibility', 'precip', 'humidity', 'cloud', 'pressure'],
  defaultProduct: 'temperature',
  maxKrigingSamples: 96,
  isoBandCount: 8,
  canvasWidth: 2048,
  apiTimeoutMs: 15000,
  reloadDebounceMs: 280,
};

/** 与后端 weather_grid_cache.product 字段对齐 */
export function toApiProduct(productId) {
  const key = normalizeProduct(productId);
  return key === 'precip' ? 'precip' : key;
}

export async function loadDemoConfig() {
  let remote = {};
  try {
    const res = await fetch('/kriging-demo/demo-config.json', { cache: 'no-cache' });
    if (res.ok) remote = await res.json();
  } catch { /* 使用 FALLBACK */ }

  const inject = window.__KRIGING_DEMO_CONFIG__ || {};
  const merged = { ...FALLBACK, ...remote, ...inject };

  const heightLevelsM = (merged.heightLevelsM || FALLBACK.heightLevelsM)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  const gridProducts = (merged.gridProducts || FALLBACK.gridProducts)
    .map((p) => normalizeProduct(p))
    .filter((p, i, arr) => arr.indexOf(p) === i);

  const productOptions = gridProducts
    .map((id) => GRID_PRODUCTS.find((p) => p.id === id))
    .filter(Boolean);

  return {
    heightLevelsM: heightLevelsM.length ? heightLevelsM : FALLBACK.heightLevelsM,
    gridProducts,
    productOptions: productOptions.length ? productOptions : GRID_PRODUCTS,
    defaultProduct: normalizeProduct(merged.defaultProduct || FALLBACK.defaultProduct),
    maxKrigingSamples: Number(merged.maxKrigingSamples) || FALLBACK.maxKrigingSamples,
    isoBandCount: Number(merged.isoBandCount) || FALLBACK.isoBandCount,
    canvasWidth: Number(merged.canvasWidth) || FALLBACK.canvasWidth,
    apiTimeoutMs: Number(merged.apiTimeoutMs) || FALLBACK.apiTimeoutMs,
    reloadDebounceMs: Number(merged.reloadDebounceMs) || FALLBACK.reloadDebounceMs,
    tiandituToken: inject.tiandituToken || merged.tiandituToken || null,
  };
}
