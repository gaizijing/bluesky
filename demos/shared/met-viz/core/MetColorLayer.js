import * as Cesium from 'cesium';
import { CesiumHeatmap } from 'cesium-heatmap-es6';
import { MET_SCALAR_GRADIENT } from '../constants';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveLngLat = (point) => {
  if (Array.isArray(point?.lnglat) && point.lnglat.length >= 2) {
    const lng = toNumber(point.lnglat[0]);
    const lat = toNumber(point.lnglat[1]);
    if (lng !== null && lat !== null) return [lng, lat];
  }
  const lng = toNumber(point?.lon ?? point?.lng ?? point?.x);
  const lat = toNumber(point?.lat ?? point?.y);
  if (lng !== null && lat !== null) return [lng, lat];
  return null;
};

const normalizeHeatmapPoints = (rawApiData) => {
  const fromGrid = Array.isArray(rawApiData?.grid)
    ? rawApiData.grid
    : Array.isArray(rawApiData?.cells)
      ? rawApiData.cells
      : null;
  const source = Array.isArray(rawApiData?.points)
    ? rawApiData.points
    : fromGrid ?? (Array.isArray(rawApiData) ? rawApiData : []);

  return source
    .map((point) => {
      const lnglat = resolveLngLat(point);
      const value = toNumber(point?.value ?? point?.riskLevel);
      if (!lnglat || value === null) return null;
      return { x: lnglat[0], y: lnglat[1], value };
    })
    .filter(Boolean);
};

const buildDataRange = (points) => {
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  return { min: Math.min(...values), max: Math.max(...values) };
};

const setProviderVisibility = (heatmapInstance, visible) => {
  if (heatmapInstance?.provider && typeof heatmapInstance.provider.show === 'boolean') {
    heatmapInstance.provider.show = visible;
  }
};

const ensureTransparentMaterial = (heatmapInstance) => {
  const rectangle = heatmapInstance?.provider?.rectangle;
  const image = heatmapInstance?.heatmap?.getDataURL?.();
  if (!rectangle || !image) return;
  rectangle.material = new Cesium.ImageMaterialProperty({ image, transparent: true });
};

/**
 * MetViz 气象填色层（cesium-heatmap-es6）
 * @param {Cesium.Viewer} viewer
 * @returns {{ setData, setVisible, destroy }}
 */
export function createMetColorLayer(viewer) {
  let heatmapInstance = null;
  let isVisible = true;
  let currentGradient = MET_SCALAR_GRADIENT;

  const clear = () => {
    if (heatmapInstance?.remove) heatmapInstance.remove();
    heatmapInstance = null;
  };

  const rebuild = (points) => {
    clear();
    if (!points.length) return;

    const heatmapDataOptions = buildDataRange(points);
    const approxGridSize = Math.max(2, Math.round(Math.sqrt(points.length)));
    const pointSpacingPx = 1000 / Math.max(1, approxGridSize - 1);
    const adaptiveRadius = Math.max(8, Math.min(26, Math.round(pointSpacingPx * 1.25)));
    const adaptiveBlur = approxGridSize >= 80 ? 0.9 : 0.95;

    heatmapInstance = new CesiumHeatmap(viewer, {
      renderType: 'entity',
      points,
      noLisenerCamera: true,
      heatmapDataOptions: heatmapDataOptions || undefined,
      heatmapOptions: {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        radius: adaptiveRadius,
        blur: adaptiveBlur,
        maxOpacity: 0.75,
        minOpacity: 0,
        gradient: currentGradient,
      },
    });

    ensureTransparentMaterial(heatmapInstance);
    setProviderVisibility(heatmapInstance, isVisible);
  };

  return {
    setData(rawApiData, options = {}) {
      if (options.gradient) currentGradient = options.gradient;
      const points = normalizeHeatmapPoints(rawApiData);
      if (!points.length) {
        clear();
        return 0;
      }
      rebuild(points);
      return points.length;
    },
    setVisible(visible) {
      isVisible = Boolean(visible);
      setProviderVisibility(heatmapInstance, isVisible);
    },
    destroy() {
      clear();
    },
  };
}
