import { fetchWeatherGridField } from '@/api/weather';
import { isImageryProduct } from '../core/colormaps';
import { createGridFieldImageryLayer } from '../core/GridFieldImageryLayer';
import { cellsToRegularGrid, parseGridFieldResponse } from '../core/parseGridField';
import { gridToColorCanvas } from '../core/gridToTexture';

/**
 * 格点气象填色（阶段 B）：规则网格 → 纹理 → 贴地
 * 当前支持：temperature、wind
 */
export class GridFieldSliceLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.imageryLayer = createGridFieldImageryLayer(viewer);
    this.visible = true;
    this._req = 0;
    this._lastKey = '';
  }

  async update({ regionId, time, product = 'temperature', heightM = 100 } = {}) {
    if (!this.viewer || !regionId) {
      this.clear();
      return;
    }

    if (!isImageryProduct(product)) {
      console.warn('[GridFieldSliceLayer] 阶段 B 暂仅支持 temperature / wind，当前:', product);
      this.clear();
      return;
    }

    const req = ++this._req;
    const key = `${regionId}|${product}|${time}|${heightM}`;
    if (key === this._lastKey) {
      this.imageryLayer.setVisible(this.visible);
      return;
    }

    try {
      const raw = await fetchWeatherGridField({ regionId, time, heightM, product });
      if (req !== this._req) return;

      if (raw?.cacheMiss || raw?.cacheHit === false) {
        console.warn(
          '[GridFieldSliceLayer] 格点缓存未命中（温度/风速填色无数据）',
          {
            regionId,
            product,
            heightM,
            time,
            bucketTime: raw?.bucketTime,
            hint:
              'R1 重启 Flyway V8 / R2 重启 V9；或 POST /api/scheduler/recompute?regionId=' + regionId,
          }
        );
        this.clear();
        return;
      }

      const parsed = parseGridFieldResponse(raw);
      if (!parsed?.cells?.length) {
        console.warn('[GridFieldSliceLayer] 无有效格点 value', {
          regionId,
          product,
          heightM,
          time,
          bucketTime: raw?.bucketTime,
        });
        this.clear();
        return;
      }

      const grid = cellsToRegularGrid(parsed.cells);
      if (!grid) {
        console.warn('[GridFieldSliceLayer] 格点不足以构成网格', parsed.cells.length);
        this.clear();
        return;
      }

      const canvas = gridToColorCanvas(grid, product);
      const bounds = parsed.bounds ?? {
        west: grid.west,
        south: grid.south,
        east: grid.east,
        north: grid.north,
      };

      this.imageryLayer.setImage(canvas, bounds);
      this.imageryLayer.setVisible(this.visible);
      this._lastKey = key;
      console.info('[GridFieldSliceLayer] 填色已更新', {
        product,
        heightM,
        bucketTime: raw?.bucketTime,
        cells: parsed.cells.length,
        grid: `${grid.width}x${grid.height}`,
      });
    } catch (err) {
      console.warn('[GridFieldSliceLayer]', product, heightM, err?.message || err);
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.imageryLayer.setVisible(this.visible);
  }

  clear() {
    this._lastKey = '';
    this.imageryLayer.clear();
  }

  destroy() {
    this.imageryLayer.destroy();
    this.viewer = null;
  }
}
