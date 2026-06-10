import { parseGridFieldResponse } from '../parseGridField';

const MAX_KRIGING_SAMPLES = 96;

function subsampleCells(cells, maxCount = MAX_KRIGING_SAMPLES) {
  if (!cells?.length || cells.length <= maxCount) return cells || [];
  const step = Math.ceil(cells.length / maxCount);
  return cells.filter((_, i) => i % step === 0).slice(0, maxCount);
}

/** 将 /weather/grid-field 响应转为 Kriging 采样 GeoJSON */
export function gridFieldToFeatureCollection(apiData, propname = 'temperature') {
  const parsed = parseGridFieldResponse(apiData);
  if (!parsed?.cells?.length) return null;

  const cells = subsampleCells(parsed.cells);
  if (cells.length < 4) return null;

  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [cell.lng, cell.lat] },
      properties: {
        [propname]: cell.value,
        value: cell.value,
      },
    })),
    bounds: parsed.bounds,
    stats: {
      count: cells.length,
      rawCount: parsed.cells.length,
      min: Math.min(...cells.map((c) => c.value)),
      max: Math.max(...cells.map((c) => c.value)),
    },
  };
}
