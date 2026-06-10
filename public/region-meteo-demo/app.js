import { loadDemoConfig, toApiProduct } from './config.js';
import { apiGet, setApiTimeout, hasAuthToken } from './api.js';
import { createMapViewer } from './basemap.js';
import {
  normalizeRegion,
  gridToFeatures,
  riskCellsToFeatures,
  subsamplePoints,
  fetchBoundaryRing,
} from './geo.js';
import {
  initLayer,
  setLayerAlpha,
  setLayerVisible,
  setIsoSurface,
  clearLayerCache,
  refreshFromCache,
  renderKrigingLayer,
  destroyLayer,
} from './layer.js';
import {
  buildKrigingColors,
  buildLegendGradient,
  formatLegendValue,
  getProductMeta,
  normalizeProduct,
} from './colormaps.js';
import { loadTerrain } from './terrain.js';
import {
  initRegionOverlays,
  applyRegionOverlays,
  setRegionLayerVisible,
  destroyRegionOverlays,
  getLandingLayer,
  getMapPopup,
} from './regionOverlays.js';
import { initWeatherPick } from './weatherPick.js';
import { flyToRegion } from './regionFly.js';
import { createLoadContext } from './regionContext.js';
import { invalidateBoundaryCache, getCachedBoundaryPack } from './boundaryCache.js';
import {
  initWindLayer,
  loadWindLayer,
  setWindVisible,
  setWindHeightM,
  destroyWindLayer,
  isWindLayerActive,
  installCesiumWindShim,
} from './windLayer.js';

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
let gridLoadSeq = 0;
let reloadTimer = null;
let abortController = null;
let boundaryPack = null;
let weatherPickCtrl = null;

const layers = {
  boundary: true,
  landing: true,
  nofly: true,
  whitemodel: true,
  routes: true,
  scalar: false,
  wind: false,
};

function log(...args) {
  console.info('[region-meteo-demo]', ...args);
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, type = 'ok') {
  const el = $('statusLine');
  if (el) {
    el.textContent = text;
    el.dataset.type = type;
  }
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
    btn.addEventListener('click', async () => {
      if (currentProduct === p.id && layers.scalar) return;
      currentProduct = p.id;
      syncProductUi();
      updateLegend(currentProduct);

      if (!layers.scalar) {
        const scalarToggle = document.querySelector('[data-layer-toggle="scalar"]');
        if (scalarToggle) scalarToggle.checked = true;
        await setLayerToggle('scalar', true);
        return;
      }
      scheduleScalarReload({ product: currentProduct });
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

function syncMeteoControlsState() {
  const disabled = !layers.scalar;
  $('alphaRange')?.toggleAttribute('disabled', disabled);
  $('isoSurfaceToggle')?.toggleAttribute('disabled', disabled);
}

function bindTreeSections() {
  document.querySelectorAll('.tree-section__head').forEach((head) => {
    head.addEventListener('click', () => {
      const section = head.closest('.tree-section');
      const open = section.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(open));
    });
  });
}

function bindPanelCollapse() {
  const panel = $('controlsPanel');
  const btn = $('panelCollapseBtn');
  if (!panel || !btn) return;

  btn.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    btn.textContent = collapsed ? '+' : '−';
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.title = collapsed ? '展开面板' : '收起面板';
  });
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
  levels.forEach((h) => {
    const span = document.createElement('span');
    span.className = 'height-tick';
    span.textContent = h;
    span.dataset.height = String(h);
    box.appendChild(span);
  });
  syncHeightUi(currentHeightM);
}

function syncLayerToggleUi() {
  document.querySelectorAll('[data-layer-toggle]').forEach((el) => {
    const key = el.dataset.layerToggle;
    el.checked = Boolean(layers[key]);
  });
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
  if (!select) return;
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

function yieldToMain(ms = 0) {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: ms + 50 });
    } else {
      setTimeout(resolve, ms);
    }
  });
}

function buildRegionStatus(parts, errors) {
  const regionPart = parts.length ? parts.join(' · ') : 'Region 图层未加载';
  const meteo = [];
  if (layers.scalar) meteo.push('标量场 ON');
  if (layers.wind) meteo.push('风场 ON');
  const suffix = meteo.length ? ' · ' + meteo.join(' · ') : '';
  if (errors?.length && !parts.length) {
    return errors.join('；') + suffix;
  }
  return regionPart + suffix;
}

async function loadGridLayer(opts = {}) {
  if (!layers.scalar) return;

  const product = normalizeProduct(opts.product ?? currentProduct);
  const heightM = opts.heightM ?? currentHeightM;
  const req = ++gridLoadSeq;

  if (abortController) abortController.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  currentProduct = product;
  currentHeightM = heightM;
  syncProductUi();
  syncHeightUi(heightM);
  updateLegend(product);

  const meta = getProductMeta(product);
  setStatus(heightM + 'm · ' + meta.label + ' 加载中…', 'loading');

  const region = currentRegion;
  if (!region?.boundaryUrl) throw new Error('Region 无 boundaryUrl');

  let points;
  if (product === 'rmet') {
    const riskPath =
      '/risk/heatmap?regionId=' + encodeURIComponent(currentRegionId)
      + '&heightM=' + heightM
      + '&time=now';
    const [riskData, boundaryRing] = await Promise.all([
      apiGet(riskPath, { signal }),
      fetchBoundaryRing(region.boundaryUrl),
    ]);
    if (req !== gridLoadSeq || !layers.scalar) return;

    const cells = Array.isArray(riskData?.cells) ? riskData.cells : [];
    if (!cells.length) {
      throw new Error(
        'R_met 风险格点为空，请确认后端风险热力已计算（POST /api/scheduler/recompute?regionId='
        + currentRegionId + '）',
      );
    }
    points = subsamplePoints(riskCellsToFeatures(cells), demoConfig.maxKrigingSamples);
    if (points.length < 4) throw new Error('R_met 有效格点不足: ' + points.length);

    setStatus(heightM + 'm · 计算 R_met 插值…', 'loading');
    await yieldToMain();
    if (req !== gridLoadSeq || !layers.scalar) return;

    const t0 = performance.now();
    renderKrigingLayer(points, boundaryRing, heightM, product);
    setLayerVisible(true);
    viewer?.scene?.requestRender();
    const ms = (performance.now() - t0).toFixed(0);
    const vals = points.map((p) => p.value);
    setStatus(
      heightM + 'm · R_met · '
      + formatLegendValue(Math.min(...vals), product) + ' ~ '
      + formatLegendValue(Math.max(...vals), product)
      + ' · ' + ms + 'ms',
      'ok',
    );
    return;
  }

  const apiProduct = toApiProduct(product);
  const gridPath =
    '/weather/grid-field?regionId=' + encodeURIComponent(currentRegionId)
    + '&product=' + encodeURIComponent(apiProduct)
    + '&heightM=' + heightM
    + '&time=now';

  const [gridData, boundaryRing] = await Promise.all([
    apiGet(gridPath, { signal }),
    fetchBoundaryRing(region.boundaryUrl),
  ]);
  if (req !== gridLoadSeq || !layers.scalar) return;

  if (gridData?.cacheMiss || !gridData?.grid?.length) {
    throw new Error(
      meta.label + ' 格点缓存未命中，请重启后端触发 Flyway V21 或 POST /api/scheduler/recompute?regionId=' + currentRegionId,
    );
  }

  points = subsamplePoints(
    gridToFeatures(gridData.grid),
    demoConfig.maxKrigingSamples,
  );
  if (points.length < 4) throw new Error('有效格点不足: ' + points.length);

  setStatus(heightM + 'm · 计算插值…', 'loading');
  await yieldToMain();
  if (req !== gridLoadSeq || !layers.scalar) return;

  const t0 = performance.now();
  renderKrigingLayer(points, boundaryRing, heightM, product);
  setLayerVisible(true);
  viewer?.scene?.requestRender();
  const ms = (performance.now() - t0).toFixed(0);

  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  setStatus(
    heightM + 'm · ' + meta.label + ' · '
    + formatLegendValue(minV, product) + ' ~ ' + formatLegendValue(maxV, product)
    + ' · ' + ms + 'ms',
    'ok',
  );
}

function scheduleScalarReload(patch = {}) {
  if (!layers.scalar) return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    loadGridLayer(patch).catch((err) => {
      if (err.name === 'AbortError') return;
      console.error('[region-meteo-demo]', err);
      setStatus(err.message || '标量场加载失败', 'error');
    });
  }, demoConfig.reloadDebounceMs);
}

async function loadWindIfEnabled() {
  if (!layers.wind) return;

  const pack = boundaryPack
    ?? getCachedBoundaryPack(currentRegion?.boundaryUrl);
  if (!pack?.geoJson) {
    throw new Error('Region boundary 未就绪，无法加载风场');
  }

  setStatus('风场加载中…', 'loading');
  await loadWindLayer(pack.geoJson, currentHeightM);
  setWindVisible(true);
  setStatus('风场已加载（GFS 静态 · Region 裁剪）', 'ok');
}

function onHeightSliderChange() {
  const idx = Number($('heightRange').value);
  const heightM = demoConfig.heightLevelsM[idx] ?? demoConfig.heightLevelsM[0];
  currentHeightM = heightM;
  syncHeightUi(heightM);
  if (layers.scalar) scheduleScalarReload({ heightM });
  if (layers.wind && isWindLayerActive()) setWindHeightM(heightM);
}

async function switchRegion(regionId) {
  const ctx = createLoadContext();
  const select = $('regionSelect');
  if (select) select.disabled = true;

  setStatus('切换 Region…', 'loading');
  setCurrentRegion(regionId);
  invalidateBoundaryCache();
  boundaryPack = null;

  try {
    initRegionOverlays(viewer);

    if (layers.scalar) {
      clearLayerCache();
      destroyLayer();
      initLayer(viewer, demoConfig);
      setLayerAlpha(alpha);
      setIsoSurface(showIsoSurface);
    }
    if (layers.wind) {
      destroyWindLayer(false);
    }

    const result = await applyRegionOverlays(currentRegion, ctx);
    if (ctx.isStale()) return;

    boundaryPack = result.boundaryPack;
    flyToRegion(viewer, currentRegion);

    const statusText = buildRegionStatus(result.parts, result.errors);
    setStatus(statusText, result.parts.length ? 'ok' : 'error');

    if (layers.scalar) await loadGridLayer().catch((err) => {
      setStatus(err.message || '标量场加载失败', 'error');
    });
    if (layers.wind) await loadWindIfEnabled().catch((err) => {
      setStatus(err.message || '风场加载失败', 'error');
    });
  } finally {
    if (select) select.disabled = false;
  }
}

async function initRegions() {
  if (!hasAuthToken()) {
    throw new Error(
      '未检测到登录 Token。请先在主系统登录（'
      + location.origin
      + '/#/login），再打开本 Demo；或 URL 加 ?token=JWT',
    );
  }

  const list = await apiGet('/regions');
  regions = (Array.isArray(list) ? list : []).map(normalizeRegion).filter(Boolean);
  if (!regions.length) throw new Error('Region 列表为空，请确认后端 /api/regions');

  currentRegionId = pickInitialRegionId(regions);
  if (!currentRegionId) throw new Error('无可用 Region');

  setCurrentRegion(currentRegionId);
  buildRegionSelect();
}

async function setLayerToggle(key, enabled) {
  layers[key] = enabled;
  syncLayerToggleUi();
  syncMeteoControlsState();

  switch (key) {
    case 'boundary':
    case 'landing':
    case 'nofly':
    case 'whitemodel':
    case 'routes':
      setRegionLayerVisible(key === 'whitemodel' ? 'whitemodel' : key, enabled);
      break;
    case 'scalar':
      updateLegend(currentProduct);
      syncMeteoControlsState();
      if (enabled) {
        initLayer(viewer, demoConfig);
        setLayerAlpha(alpha);
        setIsoSurface(showIsoSurface);
        await loadGridLayer().catch((err) => {
          setStatus(err.message || '标量场加载失败', 'error');
        });
      } else {
        if (abortController) abortController.abort();
        clearLayerCache();
        destroyLayer();
        initLayer(viewer, demoConfig);
        setStatus('标量场已关闭', 'ok');
      }
      break;
    case 'wind':
      if (enabled) {
        await loadWindIfEnabled().catch((err) => {
          layers.wind = false;
          syncLayerToggleUi();
          setStatus(err.message || '风场加载失败', 'error');
        });
      } else {
        destroyWindLayer();
      }
      break;
    default:
      break;
  }
}

function bindEvents() {
  $('regionSelect')?.addEventListener('change', (e) => {
    const nextId = e.target.value;
    if (!nextId || nextId === currentRegionId) return;
    switchRegion(nextId).catch((err) => {
      console.error('[region-meteo-demo]', err);
      setStatus(err.message || '切换 Region 失败', 'error');
    });
  });

  $('heightRange')?.addEventListener('input', onHeightSliderChange);

  $('alphaRange')?.addEventListener('input', (e) => {
    alpha = Number(e.target.value);
    syncAlphaUi();
    if (layers.scalar) setLayerAlpha(alpha);
  });

  $('isoSurfaceToggle')?.addEventListener('change', (e) => {
    showIsoSurface = e.target.checked;
    setIsoSurface(showIsoSurface);
    if (layers.scalar) refreshFromCache();
  });

  document.querySelectorAll('[data-layer-toggle]').forEach((el) => {
    el.addEventListener('change', () => {
      const key = el.dataset.layerToggle;
      setLayerToggle(key, el.checked).catch((err) => {
        console.error('[region-meteo-demo]', err);
        setStatus(err.message || '图层切换失败', 'error');
      });
    });
  });
}

async function bootstrap() {
  installCesiumWindShim();
  demoConfig = await loadDemoConfig();
  setApiTimeout(demoConfig.apiTimeoutMs);

  const defaults = demoConfig.defaultLayers || {};
  Object.keys(layers).forEach((key) => {
    if (defaults[key] !== undefined) layers[key] = defaults[key];
  });

  currentProduct = resolveInitialProduct(demoConfig.productOptions);
  currentHeightM = resolveInitialHeightM(demoConfig.heightLevelsM);

  viewer = createMapViewer('map', demoConfig);
  initLayer(viewer, demoConfig);
  setLayerAlpha(alpha);
  setIsoSurface(showIsoSurface);
  setLayerVisible(false);
  initWindLayer(viewer);
  initRegionOverlays(viewer);
  const popup = getMapPopup();
  const landing = getLandingLayer();
  weatherPickCtrl = initWeatherPick(viewer, popup, () => currentHeightM);
  landing?.setMapClickFallback((movement) => weatherPickCtrl.handleMapClick(movement));

  buildProductPills();
  buildHeightTicks();
  syncAlphaUi();
  syncIsoSurfaceUi();
  syncLayerToggleUi();
  updateLegend(currentProduct);
  bindEvents();
  bindTreeSections();
  bindPanelCollapse();
  syncMeteoControlsState();

  setStatus('加载地形…', 'loading');
  const terrain = await loadTerrain(viewer);

  await initRegions();

  setStatus('加载 Region 图层…', 'loading');
  const ctx = createLoadContext();
  const result = await applyRegionOverlays(currentRegion, ctx);
  boundaryPack = result.boundaryPack;

  Object.entries({
    boundary: layers.boundary,
    landing: layers.landing,
    nofly: layers.nofly,
    whitemodel: layers.whitemodel,
    routes: layers.routes,
  }).forEach(([key, show]) => setRegionLayerVisible(key, show));

  flyToRegion(viewer, currentRegion);
  setStatus(
    buildRegionStatus(result.parts, result.errors) + ' · 地形 ' + terrain.label,
    result.parts.length ? 'ok' : 'error',
  );

  if (layers.scalar) {
    await loadGridLayer().catch((err) => {
      setStatus(err.message || '标量场加载失败', 'error');
    });
  }
  if (layers.wind) {
    await loadWindIfEnabled().catch((err) => {
      setStatus(err.message || '风场加载失败', 'error');
    });
  }
}

bootstrap().catch((err) => {
  console.error('[region-meteo-demo] bootstrap failed', err);
  const msg = err.name === 'AbortError'
    ? '接口超时（请确认后端 8080 已启动）'
    : (err.message || '初始化失败');
  setStatus(msg, 'error');
});

window.addEventListener('beforeunload', () => {
  destroyWindLayer();
  destroyLayer();
  destroyRegionOverlays();
});
