import { loadDemoConfig, toApiProduct } from './config.js';
import { apiGet, setApiTimeout } from './api.js';
import { createMapViewer } from './basemap.js';
import {
  normalizeRegion,
  gridToFeatures,
  subsamplePoints,
  fetchBoundaryRing,
  flyToRegion,
} from './geo.js';
import {
  initLayer,
  setLayerAlpha,
  setIsoSurface,
  clearLayerCache,
  refreshFromCache,
  renderKrigingLayer,
} from './layer.js';
import {
  buildKrigingColors,
  buildLegendGradient,
  formatLegendValue,
  getProductMeta,
  normalizeProduct,
} from './colormaps.js';

const params = new URLSearchParams(location.search);

let demoConfig = null;
let regions = [];
let currentRegionId = params.get('regionId') || '';
let currentRegion = null;
let currentProduct = '';
let currentHeightM = 0;
let viewer = null;
let alpha = 0.72;
let showIsoSurface = true;
let loadSeq = 0;
let reloadTimer = null;
let abortController = null;

function log(...args) {
  console.info('[kriging-demo]', ...args);
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(type, text) {
  log('status:', type, text);
}

function pickInitialRegionId(list) {
  const fromUrl = params.get('regionId');
  if (fromUrl && list.some((r) => r.regionId === fromUrl)) return fromUrl;
  const def = list.find((r) => r.isDefault);
  if (def) return def.regionId;
  return list[0]?.regionId || '';
}

function resolveInitialHeightM(levels) {
  const fromUrl = Number(params.get('heightM'));
  if (levels.includes(fromUrl)) return fromUrl;
  return levels[0];
}

function resolveInitialProduct(options) {
  const fromUrl = normalizeProduct(params.get('product') || '');
  if (options.some((p) => p.id === fromUrl)) return fromUrl;
  const def = normalizeProduct(demoConfig?.defaultProduct || 'temperature');
  if (options.some((p) => p.id === def)) return def;
  return options[0]?.id || 'temperature';
}

function heightToSliderIndex(heightM) {
  const idx = demoConfig.heightLevelsM.indexOf(heightM);
  return idx >= 0 ? idx : 0;
}

function buildProductPills() {
  const box = $('productPills');
  box.innerHTML = '';
  demoConfig.productOptions.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-pill' + (p.id === currentProduct ? ' is-active' : '');
    btn.dataset.product = p.id;
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      if (currentProduct === p.id) return;
      currentProduct = p.id;
      syncProductUi();
      updateLegend(currentProduct);
      scheduleReload({ product: currentProduct });
    });
    box.appendChild(btn);
  });
}

function syncProductUi() {
  document.querySelectorAll('.product-pill').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.product === currentProduct);
  });
}

function updateLegend(product) {
  const meta = getProductMeta(product);
  const { colormap } = buildKrigingColors(product);
  $('legendTitle').textContent = meta.label;
  const unitEl = $('legendUnit');
  if (unitEl) unitEl.textContent = colormap.unit;
  $('legendBar').style.background = buildLegendGradient(product);
  $('legendMin').textContent = formatLegendValue(colormap.vmin, product);
  $('legendMax').textContent = formatLegendValue(colormap.vmax, product);
}

function syncHeightUi(heightM) {
  $('heightRange').value = String(heightToSliderIndex(heightM));
  document.querySelectorAll('.height-tick').forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.height) === heightM);
  });
}

function buildHeightTicks() {
  const levels = demoConfig.heightLevelsM;
  const slider = $('heightRange');
  slider.min = '0';
  slider.max = String(Math.max(0, levels.length - 1));
  slider.step = '1';

  const box = $('heightTicks');
  box.innerHTML = '';
  [...levels].reverse().forEach((h) => {
    const span = document.createElement('span');
    span.className = 'height-tick';
    span.textContent = h;
    span.dataset.height = String(h);
    box.appendChild(span);
  });
  syncHeightUi(currentHeightM);
}

function syncIsoSurfaceUi() {
  const input = $('isoSurfaceToggle');
  if (input) input.checked = showIsoSurface;
}

function syncAlphaUi() {
  const slider = $('alphaRange');
  if (slider) slider.value = String(alpha);
}

function setCurrentRegion(regionId) {
  const region = regions.find((r) => r.regionId === regionId);
  if (!region) throw new Error('Region 不存在: ' + regionId);
  currentRegionId = regionId;
  currentRegion = region;
  const select = $('regionSelect');
  if (select) select.value = regionId;
}

function buildRegionSelect() {
  const select = $('regionSelect');
  select.innerHTML = '';
  regions.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.regionId;
    opt.textContent = (r.name || r.regionId) + ' (' + r.regionId + ')' + (r.isDefault ? ' · 默认' : '');
    select.appendChild(opt);
  });
  select.value = currentRegionId;
  select.disabled = false;
}

/** 让出主线程，避免 Kriging 长时间阻塞 UI */
function yieldToMain(ms = 0) {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: ms + 50 });
    } else {
      setTimeout(resolve, ms);
    }
  });
}

async function loadGridLayer(opts = {}) {
  const product = normalizeProduct(opts.product ?? currentProduct);
  const heightM = opts.heightM ?? currentHeightM;
  const req = ++loadSeq;

  if (abortController) abortController.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  currentProduct = product;
  currentHeightM = heightM;
  syncProductUi();
  syncHeightUi(heightM);
  updateLegend(product);

  const meta = getProductMeta(product);
  const apiProduct = toApiProduct(product);
  setStatus('loading', heightM + 'm · ' + meta.label + ' 加载中…');

  const region = currentRegion;
  if (!region?.boundaryUrl) throw new Error('Region 无 boundaryUrl');

  const gridPath =
    '/weather/grid-field?regionId=' + encodeURIComponent(currentRegionId)
    + '&product=' + encodeURIComponent(apiProduct)
    + '&heightM=' + heightM
    + '&time=now';

  const [gridData, boundaryRing] = await Promise.all([
    apiGet(gridPath, { signal }),
    fetchBoundaryRing(region.boundaryUrl),
  ]);
  if (req !== loadSeq) return;

  if (gridData?.cacheMiss || !gridData?.grid?.length) {
    throw new Error(
      meta.label + ' 格点缓存未命中，请重启后端触发 Flyway V21 或 POST /api/scheduler/recompute?regionId=' + currentRegionId,
    );
  }

  const rawCount = gridData.grid.length;
  const points = subsamplePoints(
    gridToFeatures(gridData.grid),
    demoConfig.maxKrigingSamples,
  );
  if (points.length < 4) throw new Error('有效格点不足: ' + points.length);
  if (rawCount > points.length) {
    log('格点降采样', rawCount, '→', points.length);
  }

  setStatus('loading', heightM + 'm · 计算插值…');
  await yieldToMain();
  if (req !== loadSeq) return;

  const t0 = performance.now();
  renderKrigingLayer(points, boundaryRing, heightM, product);
  const ms = (performance.now() - t0).toFixed(0);

  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  setStatus(
    'ok',
    heightM + 'm · ' + meta.label + ' · '
    + formatLegendValue(minV, product) + ' ~ ' + formatLegendValue(maxV, product)
    + ' · ' + ms + 'ms',
  );
}

function scheduleReload(patch = {}) {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    loadGridLayer(patch).catch((err) => {
      if (err.name === 'AbortError') return;
      console.error('[kriging-demo]', err);
      setStatus('error', err.message || '加载失败');
    });
  }, demoConfig.reloadDebounceMs);
}

function onHeightSliderChange() {
  const idx = Number($('heightRange').value);
  const heightM = demoConfig.heightLevelsM[idx] ?? demoConfig.heightLevelsM[0];
  syncHeightUi(heightM);
  scheduleReload({ heightM });
}

async function switchRegion(regionId) {
  setCurrentRegion(regionId);
  clearLayerCache();
  flyToRegion(viewer, currentRegion);
  await loadGridLayer();
}

async function initRegions() {
  setStatus('loading', '加载 Region 列表…');
  const list = await apiGet('/regions');
  regions = (Array.isArray(list) ? list : []).map(normalizeRegion).filter(Boolean);
  if (!regions.length) throw new Error('Region 列表为空，请确认后端 /api/regions');

  currentRegionId = pickInitialRegionId(regions);
  if (!currentRegionId) throw new Error('无可用 Region');

  setCurrentRegion(currentRegionId);
  buildRegionSelect();
  log('regions loaded', regions.map((r) => r.regionId));
}

function bindEvents() {
  $('regionSelect')?.addEventListener('change', (e) => {
    const nextId = e.target.value;
    if (!nextId || nextId === currentRegionId) return;
    switchRegion(nextId).catch((err) => {
      console.error('[kriging-demo]', err);
      setStatus('error', err.message || '切换 Region 失败');
    });
  });

  $('heightRange')?.addEventListener('input', onHeightSliderChange);

  $('alphaRange')?.addEventListener('input', (e) => {
    alpha = Number(e.target.value);
    syncAlphaUi();
    setLayerAlpha(alpha);
  });

  $('isoSurfaceToggle')?.addEventListener('change', (e) => {
    showIsoSurface = e.target.checked;
    setIsoSurface(showIsoSurface);
    refreshFromCache();
  });
}

async function bootstrap() {
  log('bootstrap start');
  demoConfig = await loadDemoConfig();
  setApiTimeout(demoConfig.apiTimeoutMs);
  currentProduct = resolveInitialProduct(demoConfig.productOptions);
  currentHeightM = resolveInitialHeightM(demoConfig.heightLevelsM);

  log('config', {
    heights: demoConfig.heightLevelsM,
    products: demoConfig.gridProducts,
    samples: demoConfig.maxKrigingSamples,
  });

  setStatus('loading', '初始化地图…');
  await Promise.all([
    Promise.resolve().then(() => {
      viewer = createMapViewer('map', demoConfig);
      initLayer(viewer, demoConfig);
      setLayerAlpha(alpha);
      setIsoSurface(showIsoSurface);
      buildProductPills();
      buildHeightTicks();
      syncAlphaUi();
      syncIsoSurfaceUi();
      updateLegend(currentProduct);
      bindEvents();
    }),
    initRegions(),
  ]);

  flyToRegion(viewer, currentRegion);
  await loadGridLayer();
}

bootstrap().catch((err) => {
  console.error('[kriging-demo] bootstrap failed', err);
  const msg = err.name === 'AbortError'
    ? '接口超时（请确认后端 8080 已启动）'
    : (err.message || '初始化失败');
  setStatus('error', msg);
});
