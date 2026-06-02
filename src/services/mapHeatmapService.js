import { MAP_HEATMAP_ENABLED } from '@/config/featureFlags';
import { fetchWeatherGridField } from '@/api/weather';
import { fetchRiskHeatmap } from '@/api/risk';
import { resolveRegionId } from '@/api/regionContext';
import { gridFieldToHeatmapPayload, riskHeatmapToHeatmapPayload } from '@/utils/heatmapPayload';

const disabledPayload = () => ({
  points: [],
  source: 'disabled',
  isStale: false,
  disabled: true,
});

/**
 * 地图热力数据（仅 P2：grid-field / risk/heatmap）。旧 heatmap/geo 已移除。
 */
export async function loadMapHeatmapPayload({ mode, layerType = 'temperature', time } = {}) {
  if (!MAP_HEATMAP_ENABLED) {
    return disabledPayload();
  }

  if (mode === 'citywide') {
    return { points: [], source: 'citywide-unavailable', isStale: true };
  }

  if (layerType === 'risk') {
    try {
      const regionId = await resolveRegionId();
      const raw = await fetchRiskHeatmap({ regionId, time: time || 'now' });
      return riskHeatmapToHeatmapPayload(raw);
    } catch (e) {
      console.warn('[地图热力] risk/heatmap 失败', e?.message || e);
      return { points: [], source: 'risk-heatmap', isStale: true };
    }
  }

  try {
    const regionId = await resolveRegionId();
    const raw = await fetchWeatherGridField({
      regionId,
      product: 'temperature',
      time: time || 'now',
    });
    const payload = gridFieldToHeatmapPayload(raw);
    if (payload.points?.length) {
      return payload;
    }
  } catch (e) {
    console.warn('[地图热力] grid-field 失败', e?.message || e);
  }

  return { points: [], source: 'grid-field-empty', isStale: true };
}
