function resolveTiandituToken(configToken) {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('tiandituToken') || params.get('tk');
  if (fromUrl?.trim()) return fromUrl.trim();
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
}

export function addBasemap(viewerInstance, config = {}) {
  viewerInstance.imageryLayers.removeAll();
  const tk = resolveTiandituToken(config.tiandituToken);
  if (!tk) {
    addArcgisBasemap(viewerInstance);
    return 'arcgis';
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
  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });

  addBasemap(viewer, config);
  viewer.cesiumWidget.creditContainer.style.display = 'none';
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.fog.enabled = false;
  return viewer;
}
