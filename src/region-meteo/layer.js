import kriging from './lib/kriging.js';
import { buildKrigingColors } from './colormaps.js';
import { plotIsobands } from './isobands.js';

let viewer = null;
/** @type {Map<string, { primitive: object|null, drawCache: object|null }>} */
const layersByHeight = new Map();
let offscreenCanvas = null;
let alpha = 0.72;
let showIsoSurface = true;
let demoConfig = null;

const colorRampCache = new Map();

function layerKey(heightM) {
  return String(heightM);
}

function getLayerEntry(heightM) {
  const key = layerKey(heightM);
  if (!layersByHeight.has(key)) {
    layersByHeight.set(key, { primitive: null, drawCache: null });
  }
  return layersByHeight.get(key);
}

function effectiveLayerAlpha() {
  const count = Math.max(1, layersByHeight.size);
  return Math.max(0.18, alpha / count);
}

function getColors(product) {
  if (!colorRampCache.has(product)) {
    colorRampCache.set(product, buildKrigingColors(product));
  }
  return colorRampCache.get(product);
}

function getCanvas(w, h) {
  if (!offscreenCanvas) offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = w;
  offscreenCanvas.height = h;
  return offscreenCanvas;
}

function paintCanvas(drawCache) {
  if (!drawCache) return null;
  const {
    grid, xMin, xMax, yMin, yMax, colors, zlim, canvasW, canvasH,
  } = drawCache;
  const canvas = getCanvas(canvasW, canvasH);
  const xlim = [xMin, xMax];
  const ylim = [yMin, yMax];
  if (showIsoSurface) {
    plotIsobands(canvas, grid, xlim, ylim, colors, zlim, demoConfig?.isoBandCount ?? 8);
  } else {
    kriging.plot(canvas, grid, xlim, ylim, colors, zlim);
  }
  return canvas;
}

function removePrimitiveForHeight(heightM) {
  const entry = getLayerEntry(heightM);
  if (entry.primitive && viewer && !viewer.isDestroyed()) {
    viewer.scene.primitives.remove(entry.primitive);
  }
  entry.primitive = null;
}

function applyCanvasForHeight(heightM) {
  const entry = getLayerEntry(heightM);
  if (!entry.drawCache || !viewer) return;
  const { xMin, yMin, xMax, yMax } = entry.drawCache;
  removePrimitiveForHeight(heightM);
  entry.primitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(xMin, yMin, xMax, yMax),
          height: heightM,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }),
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({ aboveGround: true }),
    }),
  );
  const canvas = paintCanvas(entry.drawCache);
  if (!canvas) return;
  entry.primitive.appearance.material = new Cesium.Material({
    fabric: {
      type: 'Image',
      uniforms: {
        color: { alpha: effectiveLayerAlpha() },
        image: canvas.toDataURL('image/png'),
      },
    },
  });
}

export function initLayer(mapViewer, config) {
  viewer = mapViewer;
  demoConfig = config;
}

export function setLayerAlpha(value) {
  alpha = value;
  const layerAlpha = effectiveLayerAlpha();
  layersByHeight.forEach((entry) => {
    const uniforms = entry.primitive?.appearance?.material?.uniforms;
    if (uniforms?.color) uniforms.color.alpha = layerAlpha;
  });
  viewer?.scene?.requestRender();
}

export function setIsoSurface(enabled) {
  showIsoSurface = enabled;
}

export function clearLayerCache() {
  layersByHeight.forEach((entry) => {
    entry.drawCache = null;
  });
}

export function refreshFromCache() {
  layersByHeight.forEach((entry, key) => {
    if (!entry.drawCache) return;
    const canvas = paintCanvas(entry.drawCache);
    if (!canvas || !entry.primitive) return;
    entry.primitive.appearance.material = new Cesium.Material({
      fabric: {
        type: 'Image',
        uniforms: {
          color: { alpha: effectiveLayerAlpha() },
          image: canvas.toDataURL('image/png'),
        },
      },
    });
  });
  viewer?.scene?.requestRender();
}

/** Kriging 插值 + 贴图（主线程，调用前应先 yield） */
export function renderKrigingLayer(points, boundaryRing, heightM, product) {
  const values = points.map((p) => p.value);
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);

  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  boundaryRing.forEach(([lng, lat]) => {
    xMin = Math.min(xMin, lng);
    xMax = Math.max(xMax, lng);
    yMin = Math.min(yMin, lat);
    yMax = Math.max(yMax, lat);
  });

  const gridStep = Math.round(Math.min(xMax - xMin, yMax - yMin) * 10000) / 10000 / 400;
  const canvasW = demoConfig?.canvasWidth ?? 2048;
  const canvasH = Math.max(512, Math.round((canvasW / (xMax - xMin)) * (yMax - yMin)));
  const { colors, zlim } = getColors(product);

  const variogram = kriging.train(values, lngs, lats, 'exponential', 0, 100);
  const grid = kriging.grid([boundaryRing], variogram, gridStep);

  const entry = getLayerEntry(heightM);
  entry.drawCache = {
    grid, xMin, xMax, yMin, yMax, colors, zlim, heightM, canvasW, canvasH, product,
  };

  applyCanvasForHeight(heightM);

  return {
    samples: points.length,
    heightM,
    product,
    ms: 0,
  };
}

export function removeLayerAtHeight(heightM) {
  removePrimitiveForHeight(heightM);
  layersByHeight.delete(layerKey(heightM));
  viewer?.scene?.requestRender();
}

export function setLayerVisible(show) {
  layersByHeight.forEach((entry) => {
    if (entry.primitive) entry.primitive.show = show;
  });
}

export function destroyLayer() {
  Array.from(layersByHeight.keys()).forEach((key) => {
    removePrimitiveForHeight(Number(key));
  });
  layersByHeight.clear();
  viewer = null;
}

export function getActiveLayerHeights() {
  return Array.from(layersByHeight.keys()).map(Number).sort((a, b) => a - b);
}
