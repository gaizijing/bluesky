/**
 * Region Demo — 与 /api/regions 字段对齐：boundaryUrl、modelUrl、mapLift、centerLng/Lat
 */
(function RegionDemo() {
  'use strict';

  const API_BASE = '/api';
  const TERRAIN_EXAGGERATION = 1.25;
  const TERRAIN_FALLBACK_URL = 'https://data.mars3d.cn/terrain';
  const DEBUG = new URLSearchParams(location.search).has('debug');

  const FLY = {
    rangeFactor: 1.5,
    pitchDeg: -35,
    rangeMinM: 2500,
    rangeMaxM: 28000,
    heightMinM: 2500,
    heightMaxM: 10000000,
    durationS: 1.6,
  };

  const BOUNDARY_FADE = {
    fullHeightM: 22000,
    fadeHeightM: 9000,
    hideHeightM: 3500,
    throttleMs: 120,
  };

  const LANDING_PIN_SVG =
    'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">'
      + '<path d="M24 0C13.5 0 5 8.5 5 19c0 13.2 19 37 19 37s19-23.8 19-37C43 8.5 34.5 0 24 0z" fill="#f59e0b" stroke="#fff" stroke-width="2"/>'
      + '<circle cx="24" cy="19" r="8" fill="#fff"/>'
      + '</svg>',
    );

  const CLUSTER_PIN_SVG =
    'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">'
      + '<circle cx="26" cy="26" r="23" fill="rgba(0,130,220,0.28)" stroke="#00d2ff" stroke-width="2.5"/>'
      + '<circle cx="26" cy="26" r="15" fill="rgba(0,190,255,0.55)" stroke="#7ee8ff" stroke-width="1.5"/>'
      + '</svg>',
    );

  const LANDING_TYPE_LABEL = { takeoff: '起降点', operation: '作业点' };

  const NO_FLY = {
    extrudeM: 800,
    fill: 'rgba(239, 68, 68, 0.38)',
    outline: '#ef4444',
  };

  const dom = {};
  const tilesetMetaCache = new Map();

  let viewer = null;
  let regions = [];
  let currentRegion = null;
  let boundaryDataSource = null;
  let landingLayer = null;
  let noFlyLayer = null;
  let modelTileset = null;
  let boundaryCameraListener = null;
  let boundaryFadeTimer = null;
  let regionLoadSeq = 0;

  function $(id) {
    if (!dom[id]) dom[id] = document.getElementById(id);
    return dom[id];
  }

  function logDebug(...args) {
    if (DEBUG) console.log('[region-demo]', ...args);
  }

  function normalizeRegion(raw) {
    if (!raw) return null;
    const regionId = raw.regionId || raw.id;
    return {
      ...raw,
      regionId,
      id: regionId,
      boundaryUrl: raw.boundaryUrl || null,
      modelUrl: raw.modelUrl || null,
      mapLift: raw.mapLift || null,
    };
  }

  function resolveTilesetUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return null;
    return trimmed.replace(/modelinfo\.json$/i, 'tileset.json');
  }

  function createLoadContext() {
    const loadId = ++regionLoadSeq;
    return {
      loadId,
      isStale: () => loadId !== regionLoadSeq,
    };
  }

  function readToken() {
    try {
      const raw = localStorage.getItem('token');
      if (!raw || raw === 'null' || raw === 'undefined') return null;
      if (raw.startsWith('"') || raw.startsWith('{') || raw.startsWith('[')) {
        return JSON.parse(raw);
      }
      return raw;
    } catch {
      return null;
    }
  }

  function resolveTiandituToken() {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('tiandituToken') || params.get('tk');
    if (fromUrl?.trim()) return fromUrl.trim();
    const fromInject = window.__REGION_DEMO_CONFIG__?.tiandituToken;
    if (fromInject?.trim()) return fromInject.trim();
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

  async function apiGet(path) {
    const headers = { Accept: 'application/json' };
    const token = readToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch(API_BASE + path, { headers });
    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(json.message || ('HTTP ' + res.status));
    }
    return json.data;
  }

  function setStatus(type, text) {
    const box = $('statusBox');
    box.className = 'hud__status ' + type;
    box.textContent = text;
  }

  function fmt(n) {
    return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(4) : '—';
  }

  function updateMetrics(region) {
    $('mName').textContent = region.name || '—';
    $('mId').textContent = region.regionId || '—';
    $('mCenter').textContent = fmt(region.centerLng) + ', ' + fmt(region.centerLat);
    $('mGeoUrl').textContent = region.boundaryUrl || '—';
  }

  function setTerrainMetric(text) {
    $('mTerrain').textContent = text;
  }

  function setWhiteModelMetric(text) {
    $('mWhiteModel').textContent = text;
  }

  function setNoFlyMetric(text) {
    $('mNoFlyCount').textContent = text;
  }

  function capFlyRange(rangeMeters) {
    return Math.min(Math.max(rangeMeters, FLY.rangeMinM), FLY.rangeMaxM);
  }

  function resolveFlyHeight(heightMeters) {
    const height = Number(heightMeters ?? 18000);
    return Math.min(Math.max(height, FLY.heightMinM), FLY.heightMaxM);
  }

  // --- Basemap & terrain ---

  function addArcgisBasemap(viewerInstance) {
    const layer = viewerInstance.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minimumLevel: 1,
      maximumLevel: 18,
      enablePickFeatures: false,
    }));
    layer.brightness = 1.0;
    layer.contrast = 1.06;
    console.warn('[region-demo] 未配置天地图 token（?tk=），已回退 ArcGIS 卫星底图');
  }

  function addTiandituBasemap(viewerInstance) {
    const tk = resolveTiandituToken();
    if (!tk) {
      addArcgisBasemap(viewerInstance);
      return;
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
      const subs = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
      imgOpts.subdomains = subs;
      ciaOpts.subdomains = subs;
    }

    const imgLayer = viewerInstance.imageryLayers.addImageryProvider(
      new Cesium.WebMapTileServiceImageryProvider(imgOpts),
    );
    imgLayer.brightness = 1.0;
    imgLayer.contrast = 1.1;
    imgLayer.saturation = 1.1;

    const ciaLayer = viewerInstance.imageryLayers.addImageryProvider(
      new Cesium.WebMapTileServiceImageryProvider(ciaOpts),
    );
    ciaLayer.alpha = 0.85;
    logDebug('天地图底图 maxLevel=', maxLevel);
  }

  function applyTerrainSceneSettings(viewerInstance, exaggeration) {
    const ex = exaggeration ?? TERRAIN_EXAGGERATION;
    viewerInstance.scene.globe.enableLighting = false;
    viewerInstance.scene.skyAtmosphere.show = true;
    viewerInstance.scene.globe.depthTestAgainstTerrain = true;
    if (viewerInstance.scene.verticalExaggeration !== undefined) {
      viewerInstance.scene.verticalExaggeration = ex;
    } else {
      viewerInstance.scene.globe.terrainExaggeration = ex;
    }
  }

  async function tryLoadTerrainFromUrl(viewerInstance, terrainUrl) {
    const provider = await Cesium.CesiumTerrainProvider.fromUrl(terrainUrl, {
      requestWaterMask: true,
      requestVertexNormals: true,
    });
    await provider.readyPromise;
    viewerInstance.terrainProvider = provider;
    applyTerrainSceneSettings(viewerInstance);
    return terrainUrl;
  }

  async function loadTerrain(viewerInstance) {
    setTerrainMetric('加载中…');
    const candidates = [
      location.origin + '/Terrain/',
      'http://127.0.0.1:8765/Terrain/',
    ];

    for (const terrainUrl of candidates) {
      try {
        await tryLoadTerrainFromUrl(viewerInstance, terrainUrl);
        setTerrainMetric('离线 quantized-mesh（×' + TERRAIN_EXAGGERATION + '）');
        logDebug('地形已加载:', terrainUrl);
        return true;
      } catch (err) {
        console.warn('[region-demo] 地形加载失败:', terrainUrl, err);
      }
    }

    try {
      await tryLoadTerrainFromUrl(viewerInstance, TERRAIN_FALLBACK_URL);
      setTerrainMetric('在线备用地形');
      return true;
    } catch (err2) {
      console.warn('[region-demo] 在线地形也加载失败', err2);
      viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      viewerInstance.scene.globe.depthTestAgainstTerrain = false;
      setTerrainMetric('无地形（椭球）');
      return false;
    }
  }

  function createViewer() {
    viewer = new Cesium.Viewer('map', {
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
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    });

    viewer.imageryLayers.removeAll();
    addTiandituBasemap(viewer);
    viewer.cesiumWidget.creditContainer.style.display = 'none';
    viewer.scene.fog.enabled = false;
  }

  // --- White model ---

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

  /** 根据 tileset asset.generator 判断轴向（geobuilding 为 Z-up） */
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
      console.warn('[region-demo] 读取 tileset 元数据失败，使用默认轴向', err);
    }
    return common;
  }

  function applyWhiteModelStyle(tileset) {
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: 'color("white", 1.0)',
    });
  }

  function removeWhiteModel() {
    if (!modelTileset) return;
    try {
      if (viewer?.scene?.primitives?.contains(modelTileset)) {
        viewer.scene.primitives.remove(modelTileset);
      }
      if (typeof modelTileset.destroy === 'function') {
        modelTileset.destroy();
      }
    } catch (err) {
      console.warn('[region-demo] 移除白膜失败', err);
    }
    modelTileset = null;
    setWhiteModelMetric('—');
  }

  async function loadWhiteModel(region, ctx) {
    removeWhiteModel();
    const url = resolveTilesetUrl(region.modelUrl);
    if (!url) {
      setWhiteModelMetric('未配置 modelUrl');
      return false;
    }
    if (ctx?.isStale?.()) return false;

    setWhiteModelMetric('加载中…');
    try {
      const options = await resolveTilesetLoadOptions(url);
      if (ctx?.isStale?.()) return false;

      modelTileset = await Cesium.Cesium3DTileset.fromUrl(url, options);
      await modelTileset.readyPromise;
      if (ctx?.isStale?.()) {
        removeWhiteModel();
        return false;
      }

      applyWhiteModelStyle(modelTileset);
      viewer.scene.primitives.add(modelTileset);
      setWhiteModelMetric('已加载 · ' + url.split('/').slice(-2).join('/'));
      logDebug('白膜已加载', url);
      return true;
    } catch (err) {
      console.warn('[region-demo] 白膜加载失败:', url, err);
      setWhiteModelMetric('加载失败');
      modelTileset = null;
      return false;
    }
  }

  // --- Boundary ---

  function polygonHierarchyToPositions(hierarchy) {
    if (!hierarchy?.positions?.length) return null;
    const positions = hierarchy.positions.slice();
    const first = positions[0];
    const last = positions[positions.length - 1];
    if (!Cesium.Cartesian3.equals(first, last)) positions.push(first);
    return positions;
  }

  function convertBoundaryPolygonsToGroundPolylines(dataSource) {
    const entities = dataSource.entities.values.slice();
    entities.forEach((entity) => {
      if (!entity.polygon) return;
      const hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
      const positions = polygonHierarchyToPositions(hierarchy);
      const id = entity.id;
      dataSource.entities.remove(entity);
      if (!positions?.length) return;
      dataSource.entities.add({
        id,
        polyline: {
          positions,
          width: 2,
          material: Cesium.Color.fromCssColorString('#00d2ff'),
          clampToGround: true,
          arcType: Cesium.ArcType.GEODESIC,
        },
      });
    });
  }

  function updateBoundaryByCameraHeight() {
    if (!boundaryDataSource || !viewer) return;

    const height = viewer.camera.positionCartographic.height;
    let outlineAlpha = 1;
    let outlineWidth = 2;
    let show = true;

    if (height <= BOUNDARY_FADE.hideHeightM) {
      show = false;
    } else if (height <= BOUNDARY_FADE.fadeHeightM) {
      const t = (height - BOUNDARY_FADE.hideHeightM)
        / (BOUNDARY_FADE.fadeHeightM - BOUNDARY_FADE.hideHeightM);
      outlineAlpha = t;
      outlineWidth = 1 + t;
    } else if (height <= BOUNDARY_FADE.fullHeightM) {
      const t = (height - BOUNDARY_FADE.fadeHeightM)
        / (BOUNDARY_FADE.fullHeightM - BOUNDARY_FADE.fadeHeightM);
      outlineAlpha = 0.35 + 0.65 * t;
    }

    boundaryDataSource.entities.values.forEach((entity) => {
      entity.show = show;
      if (!show || !entity.polyline) return;
      entity.polyline.material = Cesium.Color.fromCssColorString(
        'rgba(0, 210, 255, ' + outlineAlpha + ')',
      );
      entity.polyline.width = outlineWidth;
    });
  }

  function unbindBoundaryCameraFade() {
    if (boundaryCameraListener && viewer) {
      viewer.camera.changed.removeEventListener(boundaryCameraListener);
      boundaryCameraListener = null;
    }
    if (boundaryFadeTimer) {
      clearTimeout(boundaryFadeTimer);
      boundaryFadeTimer = null;
    }
  }

  function bindBoundaryCameraFade() {
    unbindBoundaryCameraFade();
    boundaryCameraListener = () => {
      if (boundaryFadeTimer) return;
      boundaryFadeTimer = setTimeout(() => {
        boundaryFadeTimer = null;
        updateBoundaryByCameraHeight();
      }, BOUNDARY_FADE.throttleMs);
    };
    viewer.camera.changed.addEventListener(boundaryCameraListener);
    updateBoundaryByCameraHeight();
  }

  async function loadBoundaryGeoJson(url, ctx) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('GeoJSON 加载失败: ' + url);
    const geoJson = await res.json();
    if (ctx?.isStale?.()) return false;

    const dataSource = await Cesium.GeoJsonDataSource.load(geoJson, {
      clampToGround: true,
      stroke: Cesium.Color.fromCssColorString('#00d2ff'),
      strokeWidth: 2,
      fill: Cesium.Color.TRANSPARENT,
    });
    if (ctx?.isStale?.()) return false;

    viewer.dataSources.add(dataSource);
    convertBoundaryPolygonsToGroundPolylines(dataSource);
    boundaryDataSource = dataSource;
    bindBoundaryCameraFade();
    return true;
  }

  function collectBoundaryPositions(dataSource) {
    const positions = [];
    dataSource.entities.values.forEach((entity) => {
      if (!entity.polyline) return;
      const pts = entity.polyline.positions?.getValue
        ? entity.polyline.positions.getValue(Cesium.JulianDate.now())
        : entity.polyline.positions;
      if (pts?.length) positions.push(...pts);
    });
    return positions;
  }

  function flyToBoundingSphereWithPitch(boundingSphere, rangeMeters, duration) {
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: duration ?? FLY.durationS,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(FLY.pitchDeg),
        capFlyRange(rangeMeters),
      ),
    });
  }

  function flyToRegion(region) {
    const lift = region.mapLift || {};

    if (boundaryDataSource) {
      const positions = collectBoundaryPositions(boundaryDataSource);
      if (positions.length) {
        const bs = Cesium.BoundingSphere.fromPoints(positions);
        flyToBoundingSphereWithPitch(bs, bs.radius * FLY.rangeFactor);
        return;
      }
      viewer.flyTo(boundaryDataSource, { duration: FLY.durationS });
      return;
    }

    const centerLng = lift.longitude ?? region.centerLng;
    const centerLat = lift.latitude ?? region.centerLat;
    if (centerLng != null && centerLat != null) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          centerLng,
          centerLat,
          resolveFlyHeight(lift.height),
        ),
        orientation: {
          heading: Cesium.Math.toRadians(lift.heading ?? 0),
          pitch: Cesium.Math.toRadians(lift.pitch ?? FLY.pitchDeg),
          roll: 0,
        },
        duration: FLY.durationS,
      });
    }
  }

  function clearOverlays() {
    unbindBoundaryCameraFade();
    if (boundaryDataSource) {
      viewer.dataSources.remove(boundaryDataSource, true);
      boundaryDataSource = null;
    }
    if (landingLayer) landingLayer.clear();
    if (noFlyLayer) noFlyLayer.clear();
    removeWhiteModel();
  }

  // --- No-fly zones ---

  function extractPolygonRings(geometry) {
    if (!geometry?.coordinates) return [];
    const { type, coordinates } = geometry;
    if (type === 'Polygon' && Array.isArray(coordinates?.[0])) {
      return [coordinates[0]];
    }
    if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
      return coordinates
        .map((poly) => (Array.isArray(poly?.[0]) ? poly[0] : null))
        .filter(Boolean);
    }
    return [];
  }

  function ringCentroid(ring) {
    if (!Array.isArray(ring) || !ring.length) return null;
    let sumLng = 0;
    let sumLat = 0;
    let n = 0;
    ring.forEach((p) => {
      if (Array.isArray(p) && p.length >= 2) {
        sumLng += Number(p[0]);
        sumLat += Number(p[1]);
        n += 1;
      }
    });
    return n ? [sumLng / n, sumLat / n] : null;
  }

  class NoFlyZoneLayer {
    constructor(viewerInstance) {
      this.viewer = viewerInstance;
      this.entities = [];
    }

    async load(regionId, ctx) {
      this.clear();
      if (!regionId) return 0;

      const list = await apiGet('/no-fly-zones?regionId=' + encodeURIComponent(regionId));
      const zones = (Array.isArray(list) ? list : []).filter((z) => z.enabled !== false);
      setNoFlyMetric(String(zones.length));
      if (!zones.length || ctx?.isStale?.()) return zones.length;

      const fill = Cesium.Color.fromCssColorString(NO_FLY.fill);
      const outline = Cesium.Color.fromCssColorString(NO_FLY.outline);

      zones.forEach((zone, idx) => {
        const baseId = zone.zoneId || ('nfz-' + idx);
        const labelText = zone.name || '禁飞区';
        const rings = extractPolygonRings(zone.geometry);
        if (!rings.length) return;

        rings.forEach((ring, ringIdx) => {
          const positions = ring
            .filter((p) => Array.isArray(p) && p.length >= 2)
            .map((p) => Cesium.Cartesian3.fromDegrees(Number(p[0]), Number(p[1])));
          if (positions.length < 3) return;

          const entity = this.viewer.entities.add({
            id: 'nfz-poly-' + baseId + '-' + ringIdx,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: fill,
              outline: true,
              outlineColor: outline,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              extrudedHeight: NO_FLY.extrudeM,
              extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              classificationType: Cesium.ClassificationType.BOTH,
              closeTop: true,
              closeBottom: true,
            },
          });
          this.entities.push(entity);
        });

        const centroid = ringCentroid(rings[0]);
        if (centroid) {
          const lbl = this.viewer.entities.add({
            id: 'nfz-lbl-' + baseId,
            position: Cesium.Cartesian3.fromDegrees(
              centroid[0],
              centroid[1],
              NO_FLY.extrudeM * 0.6,
            ),
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            label: {
              text: labelText,
              font: '13px "PingFang SC", sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.fromCssColorString('#0b1a2a'),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          this.entities.push(lbl);
        }
      });

      logDebug('禁飞区已加载', zones.length);
      return zones.length;
    }

    clear() {
      this.entities.forEach((entity) => {
        try {
          this.viewer.entities.remove(entity);
        } catch (err) {
          console.warn('[region-demo] 移除禁飞区实体失败', err);
        }
      });
      this.entities = [];
      setNoFlyMetric('—');
    }
  }

  // --- Landing points ---

  class LandingPointLayer {
    constructor(viewerInstance) {
      this.viewer = viewerInstance;
      this.items = [];
      this.dataSource = null;
      this.activeId = null;
      this.overlayEl = null;
      this.postRenderHandler = null;
      this.clickHandler = null;
      this.anchor = null;
      this.#createOverlay();
      this.#bindMapClick();
    }

    #createOverlay() {
      const root = document.createElement('div');
      root.className = 'landing-overlay-root is-hidden';
      root.innerHTML =
        '<div class="landing-popup">'
        + '<button type="button" class="landing-popup__close" aria-label="关闭">×</button>'
        + '<div class="landing-popup__inner">'
        + '<h3 class="landing-popup__title"></h3>'
        + '<p class="landing-popup__row" data-field="code"></p>'
        + '<p class="landing-popup__row" data-field="type"></p>'
        + '<p class="landing-popup__row" data-field="address"></p>'
        + '<p class="landing-popup__row" data-field="coords"></p>'
        + '<p class="landing-popup__row" data-field="altitude"></p>'
        + '<p class="landing-popup__row" data-field="status"></p>'
        + '</div></div>';
      document.body.appendChild(root);
      root.querySelector('.landing-popup__close').addEventListener('click', () => this.hidePopup());
      this.overlayEl = root;
    }

    #bindMapClick() {
      this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
      this.clickHandler.setInputAction((movement) => {
        const picked = this.viewer.scene.pick(movement.position);
        if (picked?.id && Array.isArray(picked.id)) {
          this.#handleClusterClick(picked.id);
          return;
        }
        const landingId = this.#resolveLandingId(picked?.id);
        if (!landingId) {
          this.hidePopup();
          return;
        }
        this.showPopup(landingId);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      this.clickHandler.setInputAction((movement) => {
        const picked = this.viewer.scene.pick(movement.position);
        const landingId = this.#resolveLandingId(picked?.id);
        if (landingId) this.#flyToLanding(landingId);
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    #resolveLandingId(entity) {
      if (!entity) return null;
      return entity.properties?.landingPointId?.getValue?.(Cesium.JulianDate.now())
        ?? entity.properties?.landingPointId
        ?? null;
    }

    #flyToLanding(id) {
      const item = this.items.find((entry) => entry.id === id);
      if (!item) return;
      this.hidePopup();
      const lng = Number(item.point.longitude);
      const lat = Number(item.point.latitude);
      const groundH = Number.isFinite(item.surfaceH) ? item.surfaceH : 0;
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, Math.max(groundH + 650, 900)),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
        duration: 1.3,
      });
    }

    #configureClustering(dataSource) {
      dataSource.clustering.enabled = true;
      dataSource.clustering.pixelRange = 72;
      dataSource.clustering.minimumClusterSize = 2;
      dataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
        cluster.label.show = true;
        cluster.label.text = String(clusteredEntities.length);
        cluster.label.font = 'bold 14px "PingFang SC", sans-serif';
        cluster.label.fillColor = Cesium.Color.WHITE;
        cluster.label.outlineColor = Cesium.Color.fromCssColorString('#0b1a2a');
        cluster.label.outlineWidth = 3;
        cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
        cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
        cluster.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
        cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        cluster.billboard.show = true;
        cluster.billboard.image = CLUSTER_PIN_SVG;
        cluster.billboard.width = 44;
        cluster.billboard.height = 44;
        cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.CENTER;
        cluster.billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
        cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      });
    }

    #handleClusterClick(clusteredEntities) {
      this.hidePopup();
      const positions = clusteredEntities
        .map((e) => e.position?.getValue(Cesium.JulianDate.now()))
        .filter((pos) => Cesium.defined(pos));
      if (!positions.length) return;
      const bs = Cesium.BoundingSphere.fromPoints(positions);
      this.viewer.camera.flyToBoundingSphere(bs, {
        duration: 1.2,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-40),
          Math.max(bs.radius * 2.2, 8000),
        ),
      });
    }

    #ensurePostRender() {
      if (this.postRenderHandler) return;
      this.postRenderHandler = () => this.#syncOverlayPosition();
      this.viewer.scene.postRender.addEventListener(this.postRenderHandler);
    }

    #removePostRender() {
      if (!this.postRenderHandler) return;
      this.viewer.scene.postRender.removeEventListener(this.postRenderHandler);
      this.postRenderHandler = null;
    }

    #syncOverlayPosition() {
      if (!this.overlayEl || !this.anchor || this.activeId == null) return;
      const canvasCoords = this.viewer.scene.cartesianToCanvasCoordinates(this.anchor);
      if (!Cesium.defined(canvasCoords)) {
        this.overlayEl.classList.add('is-hidden');
        return;
      }
      const rect = this.viewer.canvas.getBoundingClientRect();
      this.overlayEl.style.left = (rect.left + canvasCoords.x) + 'px';
      this.overlayEl.style.top = (rect.top + canvasCoords.y) + 'px';
      this.overlayEl.classList.remove('is-hidden');
    }

    async #sampleSurfaceHeights(points) {
      const heights = new Array(points.length).fill(0);
      const provider = this.viewer.terrainProvider;
      if (!provider || provider instanceof Cesium.EllipsoidTerrainProvider) {
        points.forEach((p, i) => {
          const alt = Number(p.altitude);
          if (Number.isFinite(alt)) heights[i] = alt;
        });
        return heights;
      }

      const cartos = points.map((p) =>
        Cesium.Cartographic.fromDegrees(Number(p.longitude), Number(p.latitude)),
      );
      try {
        await Cesium.sampleTerrainMostDetailed(provider, cartos);
      } catch (err) {
        console.warn('[region-demo] 批量地形采样失败', err);
      }
      cartos.forEach((c, i) => {
        if (Number.isFinite(c.height)) {
          heights[i] = c.height;
        } else {
          const alt = Number(points[i].altitude);
          if (Number.isFinite(alt)) heights[i] = alt;
        }
      });
      return heights;
    }

    async load(regionId, ctx) {
      this.clear();
      if (!regionId) return [];

      const list = await apiGet('/landing-points?regionId=' + encodeURIComponent(regionId));
      const points = (Array.isArray(list) ? list : []).filter((p) => {
        const lng = Number(p.longitude);
        const lat = Number(p.latitude);
        return Number.isFinite(lng) && Number.isFinite(lat);
      });

      $('mLandingCount').textContent = String(points.length);
      if (!points.length || ctx?.isStale?.()) return points;

      const surfaceHeights = await this.#sampleSurfaceHeights(points);
      if (ctx?.isStale?.()) return [];

      const dataSource = new Cesium.CustomDataSource('landingPoints');
      this.viewer.dataSources.add(dataSource);
      this.dataSource = dataSource;
      dataSource.clustering.enabled = points.length >= 2;
      if (dataSource.clustering.enabled) this.#configureClustering(dataSource);

      points.forEach((point, index) => {
        const lng = Number(point.longitude);
        const lat = Number(point.latitude);
        const id = point.landingPointId || point.id;
        const surfaceH = surfaceHeights[index];
        const anchor = Cesium.Cartesian3.fromDegrees(lng, lat, surfaceH + 18);

        const entity = dataSource.entities.add({
          id: 'landing_' + id,
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          properties: { landingPointId: id, isLandingPoint: true },
          billboard: {
            image: LANDING_PIN_SVG,
            width: 40,
            height: 46,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(800, 1.15, 120000, 0.65),
          },
          label: {
            text: point.name || id,
            font: '13px "PingFang SC", "Microsoft YaHei", sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#0b1a2a'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -48),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 80000),
          },
        });

        this.items.push({ id, point, entity, anchor, surfaceH });
      });

      return points;
    }

    showPopup(id) {
      const item = this.items.find((entry) => entry.id === id);
      if (!item) return;

      this.activeId = id;
      this.anchor = item.anchor;
      const point = item.point;
      const popup = this.overlayEl.querySelector('.landing-popup');
      popup.querySelector('.landing-popup__title').textContent = point.name || id;
      popup.querySelector('[data-field="code"]').textContent = point.code || '—';
      popup.querySelector('[data-field="type"]').textContent =
        LANDING_TYPE_LABEL[point.type] || point.type || '—';
      popup.querySelector('[data-field="address"]').textContent = point.address || '—';
      popup.querySelector('[data-field="coords"]').textContent =
        fmt(Number(point.longitude)) + ', ' + fmt(Number(point.latitude));
      popup.querySelector('[data-field="altitude"]').textContent = Number.isFinite(item.surfaceH)
        ? item.surfaceH.toFixed(1) + ' m（地形采样）'
        : (point.altitude != null ? point.altitude + ' m' : '—');

      const enabled = point.enabled !== false;
      popup.querySelector('[data-field="status"]').innerHTML = enabled
        ? '<span class="landing-popup__badge">启用</span>'
        : '<span class="landing-popup__badge is-off">停用</span>';

      this.#ensurePostRender();
      this.#syncOverlayPosition();
      this.items.forEach((entry) => {
        if (entry.entity.billboard) {
          entry.entity.billboard.scale = entry.id === id ? 1.2 : 1.0;
        }
      });
    }

    hidePopup() {
      this.activeId = null;
      this.anchor = null;
      if (this.overlayEl) this.overlayEl.classList.add('is-hidden');
      this.#removePostRender();
      this.items.forEach((entry) => {
        if (entry.entity.billboard) entry.entity.billboard.scale = 1.0;
      });
    }

    clear() {
      this.hidePopup();
      if (this.dataSource) {
        this.viewer.dataSources.remove(this.dataSource, true);
        this.dataSource = null;
      }
      this.items = [];
      $('mLandingCount').textContent = '—';
    }

    destroy() {
      this.clear();
      if (this.clickHandler) {
        this.clickHandler.destroy();
        this.clickHandler = null;
      }
      if (this.overlayEl) {
        this.overlayEl.remove();
        this.overlayEl = null;
      }
    }
  }

  // --- Region apply ---

  function buildLoadStatus(parts, errors) {
    if (parts.length && !errors.length) return '已加载 ' + parts.join('、');
    if (parts.length) return '部分加载成功（' + errors.join('；') + '）';
    return errors.join('；') || '加载失败';
  }

  async function applyRegion(rawRegion) {
    const region = normalizeRegion(rawRegion);
    if (!region) return;

    const ctx = createLoadContext();
    currentRegion = region;
    setStatus('loading', '正在加载「' + (region.name || region.regionId) + '」…');
    clearOverlays();
    updateMetrics(region);

    if (region.mapLift?.terrainExaggeration != null) {
      applyTerrainSceneSettings(viewer, region.mapLift.terrainExaggeration);
    }

    const geoUrl = region.boundaryUrl;
    const errors = [];
    const parts = [];

    const [boundaryResult, landingResult, modelResult, noFlyResult] = await Promise.allSettled([
      geoUrl ? loadBoundaryGeoJson(geoUrl, ctx) : Promise.resolve(false),
      landingLayer.load(region.regionId, ctx),
      loadWhiteModel(region, ctx),
      noFlyLayer.load(region.regionId, ctx),
    ]);

    if (ctx.isStale()) return;

    if (!geoUrl) {
      errors.push('接口未返回 boundaryUrl');
    } else if (boundaryResult.status === 'fulfilled' && boundaryResult.value) {
      parts.push('边界');
    } else if (boundaryResult.status === 'rejected') {
      errors.push('边界：' + boundaryResult.reason?.message);
    } else {
      errors.push('边界加载失败');
    }

    if (landingResult.status === 'fulfilled') {
      const count = landingResult.value.length;
      if (count > 0) parts.push(count + ' 个起降点');
    } else {
      errors.push('起降点：' + landingResult.reason?.message);
    }

    if (modelResult.status === 'fulfilled' && modelResult.value) {
      parts.push('白膜');
    } else if (region.modelUrl && modelResult.status === 'rejected') {
      errors.push('白膜：' + modelResult.reason?.message);
    }

    if (noFlyResult.status === 'fulfilled') {
      const count = noFlyResult.value;
      if (count > 0) parts.push(count + ' 个禁飞区');
    } else {
      errors.push('禁飞区：' + noFlyResult.reason?.message);
    }

    setStatus(parts.length ? 'ok' : 'error', buildLoadStatus(parts, errors));
    flyToRegion(region);
    viewer.scene.requestRender();
  }

  async function loadRegions() {
    setStatus('loading', '正在请求 /api/regions …');
    const select = $('regionSelect');
    select.disabled = true;

    try {
      const list = await apiGet('/regions');
      regions = (Array.isArray(list) ? list : []).map(normalizeRegion);
      if (!regions.length) throw new Error('Region 列表为空');

      select.innerHTML = '';
      regions.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.regionId;
        opt.textContent = r.name + ' (' + r.regionId + ')' + (r.isDefault ? ' · 默认' : '');
        select.appendChild(opt);
      });
      select.disabled = false;

      const queryId = new URLSearchParams(location.search).get('regionId');
      const target = regions.find((r) => r.regionId === queryId)
        || regions.find((r) => r.isDefault)
        || regions[0];
      select.value = target.regionId;
      await applyRegion(target);
    } catch (err) {
      console.error('[region-demo]', err);
      const hint = readToken()
        ? '请确认后端已启动且账号有 Region 权限'
        : '请先在主系统登录（需 JWT），或在本页同源下访问';
      setStatus('error', 'Region 接口失败：' + err.message + '。' + hint);
      select.innerHTML = '<option value="">— 加载失败 —</option>';
    }
  }

  function bindEvents() {
    $('regionSelect').addEventListener('change', (e) => {
      const region = regions.find((r) => r.regionId === e.target.value);
      if (region) applyRegion(region);
    });

    $('btnFlyTo').addEventListener('click', () => {
      if (currentRegion) flyToRegion(currentRegion);
    });

    $('btnReload').addEventListener('click', () => {
      if (currentRegion) {
        applyRegion(currentRegion);
      } else {
        loadRegions();
      }
    });
  }

  async function init() {
    createViewer();
    landingLayer = new LandingPointLayer(viewer);
    noFlyLayer = new NoFlyZoneLayer(viewer);
    bindEvents();
    setStatus('loading', '正在加载地形…');
    await loadTerrain(viewer);
    loadRegions();
  }

  init();
})();
