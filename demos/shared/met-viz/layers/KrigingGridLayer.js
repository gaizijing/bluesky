import { fetchWeatherGridField } from '@/api/weather';
import { getRegionConfigById } from '@/api/v2/region';
import { fetchBoundaryRing } from '@/utils/geoJsonEnvelope';
import { isImageryProduct } from '../core/colormaps';
import { drawKrigingPrimitive, removeKrigingPrimitive } from '../core/kriging/drawKrigingPrimitive';
import { gridFieldToFeatureCollection } from '../core/kriging/gridToFeatures';

/**
 * 格点 Kriging 图层：后端 /weather/grid-field → 克里金插值 → 指定高度切片
 */
export class KrigingGridLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.visible = true;
    this.alpha = 0.72;
    this._primitive = null;
    this._req = 0;
    this._lastKey = '';
    this._boundaryRing = null;
    this._boundaryUrl = '';
  }

  async _resolveBoundaryRing(boundaryUrl) {
    if (!boundaryUrl) return null;
    if (this._boundaryUrl === boundaryUrl && this._boundaryRing) {
      return this._boundaryRing;
    }
    const ring = await fetchBoundaryRing(boundaryUrl);
    this._boundaryUrl = boundaryUrl;
    this._boundaryRing = ring;
    return ring;
  }

  async update({ regionId, time, product = 'temperature', heightM = 100 } = {}) {
    if (!this.viewer || !regionId || !isImageryProduct(product)) {
      this.clear();
      return;
    }

    const req = ++this._req;
    const key = `${regionId}|${product}|${time}|${heightM}`;
    if (key === this._lastKey) {
      this.setVisible(this.visible);
      return;
    }

    try {
      const [raw, region] = await Promise.all([
        fetchWeatherGridField({ regionId, time, heightM, product }),
        getRegionConfigById(regionId),
      ]);
      if (req !== this._req) return;

      if (raw?.cacheMiss || raw?.cacheHit === false || !raw?.grid?.length) {
        console.warn('[KrigingGridLayer] 格点缓存未命中', {
          regionId,
          product,
          heightM,
          time,
          bucketTime: raw?.bucketTime,
          hint: `POST /api/scheduler/recompute?regionId=${regionId}`,
        });
        this.clear();
        return;
      }

      const geojson = gridFieldToFeatureCollection(raw, 'value');
      if (!geojson?.features?.length) {
        console.warn('[KrigingGridLayer] 无有效格点', { regionId, product, heightM, time });
        this.clear();
        return;
      }

      const boundaryRing = await this._resolveBoundaryRing(region?.boundaryUrl);
      if (req !== this._req) return;
      if (!boundaryRing) {
        console.warn('[KrigingGridLayer] 区域无 boundaryUrl', regionId);
        this.clear();
        return;
      }

      removeKrigingPrimitive(this.viewer, this._primitive);
      this._primitive = null;

      // 让 UI 有机会刷新状态；Kriging train 会占用主线程
      await new Promise((resolve) => setTimeout(resolve, 0));

      const result = drawKrigingPrimitive(this.viewer, geojson, [boundaryRing], {
        propname: 'value',
        product: raw?.product || product,
        alpha: this.alpha,
        heightM,
        bucketTime: raw?.bucketTime,
      });

      this._primitive = result.primitive;
      this._primitive.show = this.visible;
      this._lastKey = key;

      console.info('[KrigingGridLayer] 格点 Kriging 已更新', {
        regionId,
        product: raw?.product || product,
        heightM,
        bucketTime: raw?.bucketTime,
        samples: result.stats.sampleCount,
        rawCells: geojson?.stats?.rawCount,
        range: `${result.stats.valueMin}~${result.stats.valueMax}`,
      });
    } catch (err) {
      console.warn('[KrigingGridLayer]', err?.message || err);
      this.clear();
    }
  }

  setAlpha(alpha) {
    const next = Number(alpha);
    if (!Number.isFinite(next)) return;
    this.alpha = Math.max(0.1, Math.min(1, next));
    const uniforms = this._primitive?.appearance?.material?.uniforms;
    if (uniforms?.color) {
      uniforms.color.alpha = this.alpha;
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (this._primitive) {
      this._primitive.show = this.visible;
    }
  }

  clear() {
    removeKrigingPrimitive(this.viewer, this._primitive);
    this._primitive = null;
    this._lastKey = '';
  }

  destroy() {
    this.clear();
    this._boundaryRing = null;
    this._boundaryUrl = '';
    this.viewer = null;
  }
}
