const tilesetMetaCache = new Map();

let viewer = null;
let modelTileset = null;
let visible = true;

function resolveTilesetUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;
  return trimmed.replace(/modelinfo\.json$/i, 'tileset.json');
}

function baseTilesetOptions() {
  return {
    maximumScreenSpaceError: 16,
    skipLevelOfDetail: true,
    baseScreenSpaceError: 1024,
    skipScreenSpaceErrorFactor: 16,
    skipLevels: 1,
    immediatelyLoadDesiredLevelOfDetail: false,
    loadSiblings: false,
    cullWithChildrenBounds: true,
    cullRequestsWhileMoving: true,
    cullRequestsWhileMovingMultiplier: 10,
    progressiveResolutionHeightFraction: 0.5,
    preferLeaves: false,
    maximumMemoryUsage: 768,
    maximumNumberOfLoadedTiles: 48,
  };
}

async function fetchTilesetMeta(url) {
  if (tilesetMetaCache.has(url)) return tilesetMetaCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('tileset.json 加载失败: ' + url);
  const meta = await res.json();
  tilesetMetaCache.set(url, meta);
  return meta;
}

async function resolveTilesetLoadOptions(url) {
  const common = baseTilesetOptions();
  try {
    const meta = await fetchTilesetMeta(url);
    const generator = String(meta?.asset?.generator || '');
    if (/geobuilding/i.test(generator)) {
      return {
        ...common,
        modelUpAxis: Cesium.Axis.Z,
        modelForwardAxis: Cesium.Axis.X,
      };
    }
  } catch (err) {
    console.warn('[region-meteo-demo] 读取 tileset 元数据失败', err);
  }
  return common;
}

function applyWhiteModelStyle(tileset) {
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: 'color("white", 1.0)',
  });
}

export function initWhiteModelLayer(viewerInstance) {
  viewer = viewerInstance;
}

export function removeWhiteModel() {
  if (!modelTileset) return;
  try {
    if (viewer?.scene?.primitives?.contains(modelTileset)) {
      viewer.scene.primitives.remove(modelTileset);
    }
    if (typeof modelTileset.destroy === 'function') {
      modelTileset.destroy();
    }
  } catch (err) {
    console.warn('[region-meteo-demo] 移除白膜失败', err);
  }
  modelTileset = null;
}

export async function loadWhiteModel(region, ctx) {
  removeWhiteModel();
  const url = resolveTilesetUrl(region.modelUrl);
  if (!url) return { ok: false, label: '未配置 modelUrl' };
  if (ctx?.isStale?.()) return { ok: false, label: '—' };

  try {
    const options = await resolveTilesetLoadOptions(url);
    if (ctx?.isStale?.()) return { ok: false, label: '—' };

    modelTileset = await Cesium.Cesium3DTileset.fromUrl(url, options);
    await modelTileset.readyPromise;
    if (ctx?.isStale?.()) {
      removeWhiteModel();
      return { ok: false, label: '—' };
    }

    applyWhiteModelStyle(modelTileset);
    modelTileset.show = visible;
    viewer.scene.primitives.add(modelTileset);
    return { ok: true, label: '已加载' };
  } catch (err) {
    console.warn('[region-meteo-demo] 白膜加载失败:', url, err);
    modelTileset = null;
    return { ok: false, label: '加载失败' };
  }
}

export function setWhiteModelVisible(show) {
  visible = show;
  if (modelTileset) modelTileset.show = show;
}

export function clearWhiteModel() {
  removeWhiteModel();
}
