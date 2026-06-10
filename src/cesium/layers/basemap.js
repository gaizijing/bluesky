import * as Cesium from 'cesium';
import { getMapTilesConfig } from '@/config/mapTiles';

let baseLayers = [];

function applyLayerStyle(layer, alpha = 1.0) {
  if (!layer) return;
  layer.brightness = 1.0;
  layer.contrast = 1.1;
  layer.saturation = 1.1;
  layer.alpha = alpha;
}

function clearBaseLayers(viewer) {
  if (!viewer) return;
  baseLayers.forEach((layer) => {
    try {
      viewer.imageryLayers.remove(layer, true);
    } catch (e) {
      console.warn('[Basemap] remove layer failed', e);
    }
  });
  baseLayers = [];
}

function addImageryProvider(viewer, provider) {
  const layer = viewer.imageryLayers.addImageryProvider(provider);
  baseLayers.push(layer);
  return layer;
}

function addArcgisLayer(viewer) {
  const provider = new Cesium.UrlTemplateImageryProvider({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    minimumLevel: 1,
    maximumLevel: 18,
    tileWidth: 256,
    tileHeight: 256,
    enablePickFeatures: false,
    credit: new Cesium.Credit(
      'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    ),
  });
  applyLayerStyle(addImageryProvider(viewer, provider), 1.0);
}

function addGaodeLayer(viewer) {
  const img = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    minimumLevel: 1,
    maximumLevel: 18,
    tileWidth: 256,
    tileHeight: 256,
    enablePickFeatures: false,
  });
  applyLayerStyle(addImageryProvider(viewer, img), 1.0);

  const cia = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
    minimumLevel: 1,
    maximumLevel: 18,
    tileWidth: 256,
    tileHeight: 256,
    enablePickFeatures: false,
  });
  applyLayerStyle(addImageryProvider(viewer, cia), 0.8);
}

function buildTiandituWmtsUrl(layerKey, tk) {
  const query =
    'service=wmts&request=GetTile&version=1.0.0'
    + `&LAYER=${layerKey}&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}`
    + '&style=default&format=tiles&tk='
    + tk;

  // 开发环境走 Vite 同源代理，避免 localhost 直连天地图触发 CORS / 502 风暴
  if (import.meta.env.DEV) {
    return `/tianditu-proxy/${layerKey}_w/wmts?${query}`;
  }

  return (
    `https://{s}.tianditu.gov.cn/${layerKey}_w/wmts?${query}`
  );
}

function addTiandituLayer(viewer, cfg) {
  const tk = String((cfg?.cesium?.tianditu_token || '')).trim();
  if (!tk) {
    console.warn('[Basemap] 未配置天地图 token，回退 ArcGIS 卫星底图');
    addArcgisLayer(viewer);
    return;
  }

  const useProxy = import.meta.env.DEV;
  const maxLevel = useProxy ? 16 : 18;

  const img = new Cesium.WebMapTileServiceImageryProvider({
    url: buildTiandituWmtsUrl('img', tk),
    layer: 'img',
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    subdomains: useProxy ? undefined : ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
    maximumLevel: maxLevel,
    enablePickFeatures: false,
    credit: new Cesium.Credit('天地图影像'),
  });
  applyLayerStyle(addImageryProvider(viewer, img), 1.0);

  const cia = new Cesium.WebMapTileServiceImageryProvider({
    url: buildTiandituWmtsUrl('cia', tk),
    layer: 'cia',
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    subdomains: useProxy ? undefined : ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
    maximumLevel: maxLevel,
    enablePickFeatures: false,
    credit: new Cesium.Credit('天地图注记'),
  });
  applyLayerStyle(addImageryProvider(viewer, cia), 0.85);

  if (useProxy) {
    console.log('[Basemap] 天地图开发模式：经 /tianditu-proxy 代理，maxLevel=', maxLevel);
  }
}

function detectBasemapType(cfg) {
  const c = cfg.cesium || {};
  if (cfg.offline_mode === false) {
    let onlineLayer = c.base_layer ? String(c.base_layer).toLowerCase() : 'arcgis';
    if (onlineLayer === 'local') onlineLayer = 'arcgis';
    return onlineLayer;
  }
  if (c.base_layer) return String(c.base_layer).toLowerCase();

  const url = String(cfg.tile_layer?.url_template || '').toLowerCase();
  if (url.includes('arcgisonline.com')) return 'arcgis';
  if (url.includes('autonavi.com')) return 'gaode';
  if (url.includes('tianditu.gov.cn')) return 'tianditu';
  if (url.includes('127.0.0.1') || url.includes('localhost')) return 'local';
  return 'arcgis';
}

function addLocalImageryLayer(viewer, cfg) {
  const tl = cfg.tile_layer || {};
  const url = tl.url_template;
  if (!url) {
    console.warn('[Imagery] 本地瓦片 url_template 未配置，回退在线底图');
    addArcgisLayer(viewer);
    return;
  }

  const useTms = !!tl.tms;
  const useGeographic = String(tl.projection || tl.proj || 'EPSG:4326').toUpperCase().includes('4326');
  let tileUrl = url;
  if (useTms && tileUrl.indexOf('{reverseY}') < 0) {
    tileUrl = tileUrl.replace('{y}', '{reverseY}');
  }

  const providerOptions = {
    url: tileUrl,
    minimumLevel: Number(cfg.min_zoom) || 0,
    maximumLevel: Number(tl.maximumLevel || cfg.max_zoom || 18),
    tileWidth: Number(tl.tile_size) || 256,
    tileHeight: Number(tl.tile_size) || 256,
    enablePickFeatures: false,
    credit: new Cesium.Credit('Local Offline Tiles'),
  };

  if (useGeographic) {
    providerOptions.tilingScheme = new Cesium.GeographicTilingScheme();
  }

  if (useTms) {
    providerOptions.customTags = {
      reverseY: (imageryProvider, x, y, level) => {
        const yTiles = imageryProvider.tilingScheme.getNumberOfYTilesAtLevel(level);
        return yTiles - y - 1;
      },
    };
  }

  const bounds = tl.bounds;
  if (bounds?.west != null && bounds?.south != null && bounds?.east != null && bounds?.north != null) {
    providerOptions.rectangle = Cesium.Rectangle.fromDegrees(
      Number(bounds.west),
      Number(bounds.south),
      Number(bounds.east),
      Number(bounds.north),
    );
  }

  console.log('[Imagery] 加载本地瓦片', {
    url: tileUrl,
    tms: useTms,
    geographic: useGeographic,
    maximumLevel: providerOptions.maximumLevel,
  });

  const provider = new Cesium.UrlTemplateImageryProvider(providerOptions);
  applyLayerStyle(addImageryProvider(viewer, provider), 1.0);
}

/** 与 map.js switchBaseLayer 一致 */
export function switchBaseLayer(viewer, cfg = getMapTilesConfig()) {
  if (!viewer) return;
  clearBaseLayers(viewer);

  const type = detectBasemapType(cfg);
  if (type === 'local') {
    addLocalImageryLayer(viewer, cfg);
    return;
  }
  if (type === 'gaode') {
    addGaodeLayer(viewer);
    return;
  }
  if (type === 'tianditu') {
    addTiandituLayer(viewer, cfg);
    return;
  }
  addArcgisLayer(viewer);
}
