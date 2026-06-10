function resolveTiandituToken(configToken) {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('tiandituToken') || params.get('tk');
  if (fromUrl?.trim()) return fromUrl.trim();
  const fromInject = window.__REGION_METEO_DEMO_CONFIG__?.tiandituToken;
  if (fromInject?.trim()) return fromInject.trim();
  if (configToken?.trim()) return configToken.trim();
  try {
    const fromStorage = localStorage.getItem('tiandituToken');
    if (fromStorage?.trim()) return fromStorage.trim();
  } catch { /* ignore */ }
  return null;
}

function useTiandituProxy() {
  return /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}

function buildTiandituWmtsUrl(layerKey, tk) {
  const query =
    'service=wmts&request=GetTile&version=1.0.0'
    + '&LAYER=' + layerKey + '&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}'
    + '&style=default&format=tiles&tk=' + tk;
  if (useTiandituProxy()) {
    return '/tianditu-proxy/' + layerKey + '_w/wmts?' + query;
  }
  return 'https://{s}.tianditu.gov.cn/' + layerKey + '_w/wmts?' + query;
}

function addArcgisBasemap(viewerInstance) {
  const layer = viewerInstance.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minimumLevel: 1,
      maximumLevel: 18,
      enablePickFeatures: false,
    }),
  );
  layer.brightness = 1.05;
  return 'arcgis';
}

export function addBasemap(viewerInstance, config = {}) {
  viewerInstance.imageryLayers.removeAll();

  const params = new URLSearchParams(location.search);
  if (params.get('base') === 'arcgis') {
    return addArcgisBasemap(viewerInstance);
  }

  const tk = resolveTiandituToken(config.tiandituToken);
  if (!tk) {
    console.warn('[region-meteo-demo] 未配置天地图 token，已回退 ArcGIS 卫星底图');
    return addArcgisBasemap(viewerInstance);
  }

  const maxLevel = useTiandituProxy() ? 16 : 18;
  const wmtsCommon = {
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    maximumLevel: maxLevel,
    enablePickFeatures: false,
  };
  const imgOpts = { url: buildTiandituWmtsUrl('img', tk), layer: 'img', ...wmtsCommon };
  const ciaOpts = { url: buildTiandituWmtsUrl('cia', tk), layer: 'cia', ...wmtsCommon };
  if (!useTiandituProxy()) {
    imgOpts.subdomains = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
    ciaOpts.subdomains = imgOpts.subdomains;
  }
  viewerInstance.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider(imgOpts));
  const cia = viewerInstance.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider(ciaOpts),
  );
  cia.alpha = 0.85;
  return 'tianditu';
}

export function createMapViewer(container, config = {}) {
  // 避免 Viewer 默认拉取 Cesium Ion 底图（无效 token 会 401）
  if (Cesium.Ion) Cesium.Ion.defaultAccessToken = undefined;

  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    baseLayer: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });

  addBasemap(viewer, config);
  viewer.cesiumWidget.creditContainer.style.display = 'none';
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.fog.enabled = false;
  return viewer;
}
