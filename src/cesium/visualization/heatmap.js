import * as Cesium from 'cesium';
import { CesiumHeatmap } from 'cesium-heatmap-es6';
import { watch } from 'vue';
import { getCitywideHeatmap, getWeatherHeatmapGeo } from '@/api';
import warningIcon from '@/assets/icons/ic_warning.png';
import { tr } from 'element-plus/es/locales.mjs';

const HEATMAP_GRADIENT = {
  '0.0': 'rgba(29, 78, 216, 0)',
  '0.25': '#1d4ed8',
  '0.45': '#22c55e',
  '0.65': '#facc15',
  '0.82': '#fb923c',
  '0.96': '#ef4444'
};

const HIGH_RISK_THRESHOLD = 80;
const MAX_REASON_MARKERS = 20;
// 粗略去重阈值（角度），用于避免标注挤在一起；2km 区域内这个值够用。
const MARKER_MIN_DISTANCE_DEG = 0.003;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toText = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text : null;
};

const resolveLngLat = (point) => {
  if (Array.isArray(point?.lnglat) && point.lnglat.length >= 2) {
    const lng = toNumber(point.lnglat[0]);
    const lat = toNumber(point.lnglat[1]);
    if (lng !== null && lat !== null) {
      return [lng, lat];
    }
  }

  const lng = toNumber(point?.lon ?? point?.lng ?? point?.x);
  const lat = toNumber(point?.lat ?? point?.y);
  if (lng !== null && lat !== null) {
    return [lng, lat];
  }

  return null;
};

const normalizeHeatmapPoints = (rawApiData) => {
  const source = Array.isArray(rawApiData?.points)
    ? rawApiData.points
    : Array.isArray(rawApiData)
      ? rawApiData
      : [];

  return source
    .map((point) => {
      const lnglat = resolveLngLat(point);
      const value = toNumber(point?.value ?? point?.riskLevel);
      const reason = toText(point?.reason);
      if (!lnglat || value === null) {
        return null;
      }

      return {
        x: lnglat[0],
        y: lnglat[1],
        value,
        reason
      };
    })
    .filter(Boolean);
};

const normalizeApiHeatmapPayload = (response) => {
  if (Array.isArray(response)) {
    return { points: response };
  }

  if (Array.isArray(response?.points)) {
    return response;
  }

  if (Array.isArray(response?.data?.points)) {
    return response.data;
  }

  if (Array.isArray(response?.data)) {
    return { points: response.data };
  }

  return { points: [] };
};

const buildDataRange = (points) => {
  if (!points.length) {
    return null;
  }

  const values = points.map((point) => point.value);
  const max = Math.max(...values);
  return { min: 0, max };
};

const setProviderVisibility = (heatmapInstance, visible) => {
  if (!heatmapInstance || !heatmapInstance.provider) {
    return;
  }

  if (typeof heatmapInstance.provider.show === 'boolean') {
    heatmapInstance.provider.show = visible;
  }
};

const ensureTransparentMaterial = (heatmapInstance) => {
  const provider = heatmapInstance?.provider;
  const rectangle = provider?.rectangle;
  if (!rectangle) {
    return;
  }

  const image = heatmapInstance?.heatmap?.getDataURL?.();
  if (!image) {
    return;
  }

  rectangle.material = new Cesium.ImageMaterialProperty({
    image,
    transparent: true
  });
};

export const initHeatVolume = async (viewer) => {
  let heatmapInstance = null;
  let isVisible = true;
  let reasonEntities = [];

  const clear = () => {
    if (reasonEntities.length) {
      reasonEntities.forEach((entity) => {
      viewer.entities.remove(entity);
      });
      reasonEntities = [];
    }
    if (heatmapInstance && typeof heatmapInstance.remove === 'function') {
      heatmapInstance.remove();
    }
    heatmapInstance = null;
  };

  const createReasonMarkers = (points) => {
    if (!Array.isArray(points) || !points.length) return;

    const candidates = points
      .filter((point) => point && point.reason && typeof point.value === 'number' && point.value >= HIGH_RISK_THRESHOLD)
      .sort((a, b) => b.value - a.value);

    if (!candidates.length) return;

    const picked = [];
    const minD2 = MARKER_MIN_DISTANCE_DEG * MARKER_MIN_DISTANCE_DEG;

    for (const point of candidates) {
      if (picked.length >= MAX_REASON_MARKERS) break;
      let tooClose = false;
      for (const other of picked) {
        const dx = point.x - other.x;
        const dy = point.y - other.y;
        if (dx * dx + dy * dy < minD2) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) picked.push(point);
    }

    reasonEntities = picked.map((point) => {
      const position = Cesium.Cartesian3.fromDegrees(point.x, point.y, 0);
      return viewer.entities.add({
        show: isVisible,
        position,
        billboard: {
          image: warningIcon,
          width: 22,
          height: 22,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000)
        },
        label: {
          text: point.reason,
          font: '14px Microsoft YaHei',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          showBackground: true,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.55),
          pixelOffset: new Cesium.Cartesian2(0, -28),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000)
        }
      });
    });
  };

  const rebuild = (points) => {
    clear();

    if (!points.length) {
      return;
    }

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
        gradient: HEATMAP_GRADIENT
      }
    });

    ensureTransparentMaterial(heatmapInstance);
    setProviderVisibility(heatmapInstance, isVisible);
    createReasonMarkers(points);
  };

  return {
    setData(rawApiData) {
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
      if (reasonEntities.length) {
        reasonEntities.forEach((entity) => {
          entity.show = isVisible;
        });
      }
    },
    destroy() {
      clear();
    },
    getInstance() {
      return heatmapInstance;
    }
  };

};

const resolveAreaPointId = ({ areaStore, heatmapStore }) => {
  return (
    heatmapStore?.currentPointId ||
    areaStore?.selectedArea?.id ||
    areaStore?.selectedArea?.pointId ||
    null
  );
};

const fetchHeatmapPayloadByMode = async ({ mode, pointId, time }) => {
  if (mode === 'citywide') {
    const citywideResponse = await getCitywideHeatmap();
    return normalizeApiHeatmapPayload(citywideResponse);
  }

  if (!pointId) {
    return { points: [] };
  }

  const areaResponse = await getWeatherHeatmapGeo({ pointId, time });
  return normalizeApiHeatmapPayload(areaResponse);
};

export const createReactiveHeatmapBridge = ({
  heatmapManager,
  heatmapStore,
  layerSettingsStore,
  areaStore,
  getCurrentTime
}) => {
  if (!heatmapManager) {
    throw new Error('[HeatmapBridge] heatmapManager is required');
  }
  if (!heatmapStore || !layerSettingsStore || !areaStore) {
    throw new Error('[HeatmapBridge] stores are required');
  }

  const unwatchers = [];
  let requestToken = 0;
  let isApplyingStoreData = false;

  const applyVisibilityFromStore = () => {
    const visible = layerSettingsStore.layers.temperature?.visible !== false;
    heatmapManager.setVisible(visible);
  };

  const refresh = async (timeInput) => {
    const currentToken = ++requestToken;
    const mode = heatmapStore.heatmapMode === 'citywide' ? 'citywide' : 'area';
    const pointId = resolveAreaPointId({ areaStore, heatmapStore });
    const refreshTime = timeInput || (typeof getCurrentTime === 'function' ? getCurrentTime() : new Date());

    const payload = await fetchHeatmapPayloadByMode({
      mode,
      pointId,
      time: refreshTime
    });

    if (currentToken !== requestToken) {
      return null;
    }

    if (mode === 'area' && pointId) {
      heatmapStore.setCurrentPointId(pointId);
    }

    isApplyingStoreData = true;
    heatmapStore.setHeatmapData(payload);
    isApplyingStoreData = false;

    heatmapManager.setData(payload);
    applyVisibilityFromStore();
    return payload;
  };

  const setMode = async (mode, timeInput) => {
    if (typeof heatmapStore.setHeatmapMode === 'function') {
      heatmapStore.setHeatmapMode(mode);
    } else {
      heatmapStore.heatmapMode = mode;
    }
    return refresh(timeInput);
  };

  const setAreaPointId = async (pointId, timeInput) => {
    if (!pointId) {
      return null;
    }
    if (typeof heatmapStore.setCurrentPointId === 'function') {
      heatmapStore.setCurrentPointId(pointId);
    } else {
      heatmapStore.currentPointId = pointId;
    }

    if (heatmapStore.heatmapMode !== 'area') {
      return null;
    }

    return refresh(timeInput);
  };

  unwatchers.push(
    watch(
      () => layerSettingsStore.layers.temperature?.visible,
      () => {
        applyVisibilityFromStore();
      }
    )
  );

  unwatchers.push(
    watch(
      () => heatmapStore.heatmapMode,
      async () => {
        try {
          await refresh();
        } catch (error) {
          console.error('[HeatmapBridge] mode refresh failed', error);
        }
      }
    )
  );

  // 选区可能在 Cesium 初始化后才注入（或在 watch 建立前就已存在），这里做一次立即同步，避免热力图空白不刷新。
  unwatchers.push(
    watch(
      () => resolveAreaPointId({ areaStore, heatmapStore }),
      async (pointId) => {
        if (!pointId) {
          return;
        }
        if (heatmapStore.heatmapMode !== 'area') {
          return;
        }
        try {
          await setAreaPointId(pointId);
        } catch (error) {
          console.error('[HeatmapBridge] area refresh failed', error);
        }
      },
      { immediate: true }
    )
  );

  unwatchers.push(
    watch(
      () => heatmapStore.heatmapData,
      (newData) => {
        if (isApplyingStoreData) {
          return;
        }
        heatmapManager.setData(normalizeApiHeatmapPayload(newData));
        applyVisibilityFromStore();
      },
      { deep: true }
    )
  );

  applyVisibilityFromStore();

  return {
    refresh,
    setMode,
    setAreaPointId,
    setVisible: (visible) => heatmapManager.setVisible(visible),
    destroy() {
      unwatchers.forEach((unwatch) => {
        if (typeof unwatch === 'function') {
          unwatch();
        }
      });
      unwatchers.length = 0;
    }
  };
};
