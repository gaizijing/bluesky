import kriging from './lib/kriging.js';
import { buildKrigingColors } from './colormaps.js';
import { plotIsobands } from './isobands.js';

let viewer = null;
let primitive = null;
let offscreenCanvas = null;
let drawCache = null;
let alpha = 0.72;
let showIsoSurface = true;
let demoConfig = null;

const colorRampCache = new Map();

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

function paintCanvas() {
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

function removePrimitive() {
  if (primitive && viewer && !viewer.isDestroyed()) {
    viewer.scene.primitives.remove(primitive);
  }
  primitive = null;
}

function applyCanvas(canvas) {
  if (!drawCache || !viewer) return;
  const { xMin, yMin, xMax, yMax, heightM } = drawCache;
  removePrimitive();
  primitive = viewer.scene.primitives.add(
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
  primitive.appearance.material = new Cesium.Material({
    fabric: {
      type: 'Image',
      uniforms: {
        color: { alpha },
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
  const uniforms = primitive?.appearance?.material?.uniforms;
  if (uniforms?.color) uniforms.color.alpha = alpha;
  viewer?.scene?.requestRender();
}

export function setIsoSurface(enabled) {
  showIsoSurface = enabled;
}

export function clearLayerCache() {
  drawCache = null;
}

export function refreshFromCache() {
  const canvas = paintCanvas();
  if (canvas) applyCanvas(canvas);
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

  drawCache = {
    grid, xMin, xMax, yMin, yMax, colors, zlim, heightM, canvasW, canvasH,
  };

  const canvas = paintCanvas();
  applyCanvas(canvas);

  return {
    samples: points.length,
    heightM,
    product,
    ms: 0,
  };
}

export function setLayerVisible(show) {
  if (primitive) primitive.show = show;
}

export function destroyLayer() {
  removePrimitive();
  drawCache = null;
  viewer = null;
}
