import * as Cesium from 'cesium';
import { fetchRiskHeatmap } from '@/api/risk';
import { fetchRegions } from '@/api/v2/region';
import { fetchGeoJsonEnvelope } from '@/utils/geoJsonEnvelope';
import { extractIsosurfaceFromGrid, fillChunkGrid } from '../core/marchingCubes.js';
import { createChunkGrid, getVisibleChunks } from '../core/spatialChunks.js';
import {
  buildVolumeFromRegion,
  createRiskSampler,
  riskIsovalueFromCells,
} from '../core/rMetVolume.js';

const RISK_COLOR = Cesium.Color.fromBytes(255, 72, 48, 110);

/**
 * R_met 等值体层（Marching Cubes）+ 鼠标 Tooltip
 */
export class McRiskLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.volume = null;
    this.chunks = [];
    this.chunkRecords = new Map();
    this.cells = [];
    this.isovalue = 0.42;
    this.enableCulling = true;
    this.divisions = 4;
    this.visible = true;
    this.handler = null;
    this.tooltipEl = null;
    this._req = 0;
    this._destroyed = false;
    this._moveEndRemover = null;
    this._rebuildTimer = null;
    this._bindTooltip();
    this._bindCameraRefresh();
  }

  _bindCameraRefresh() {
    if (!this.viewer?.camera?.moveEnd) return;
    this._moveEndRemover = this.viewer.camera.moveEnd.addEventListener(() => {
      if (!this.visible || !this.volume || !this.cells.length) return;
      if (this._rebuildTimer) clearTimeout(this._rebuildTimer);
      this._rebuildTimer = setTimeout(() => {
        this._rebuildTimer = null;
        this._rebuildMeshes();
      }, 600);
    });
  }

  _bindTooltip() {
    if (!this.viewer) return;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'met-viz-tooltip';
    this.tooltipEl.style.cssText =
      'display:none;position:fixed;z-index:9999;padding:8px 10px;border-radius:8px;' +
      'background:rgba(15,23,51,0.92);color:#e2e8f0;font-size:12px;pointer-events:none;' +
      'border:1px solid rgba(59,130,246,0.4);max-width:260px;line-height:1.45;';
    document.body.appendChild(this.tooltipEl);

    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction((movement) => {
      if (!this.visible || !this.cells.length) {
        this._hideTooltip();
        return;
      }
      const cartesian = this.viewer.camera.pickEllipsoid(
        movement.endPosition,
        this.viewer.scene.globe.ellipsoid
      );
      if (!cartesian) {
        this._hideTooltip();
        return;
      }
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lng = Cesium.Math.toDegrees(carto.longitude);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const cell = this._nearestCell(lng, lat);
      if (!cell) {
        this._hideTooltip();
        return;
      }
      const rect = this.viewer.scene.canvas.getBoundingClientRect();
      this.tooltipEl.style.left = `${rect.left + movement.endPosition.x + 12}px`;
      this.tooltipEl.style.top = `${rect.top + movement.endPosition.y + 12}px`;
      this.tooltipEl.style.display = 'block';
      this.tooltipEl.innerHTML = this._formatCell(cell);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  _nearestCell(lng, lat) {
    let best = null;
    let bestD = 0.08;
    for (const c of this.cells) {
      const clng = Number(c.lng);
      const clat = Number(c.lat);
      if (!Number.isFinite(clng) || !Number.isFinite(clat)) continue;
      const d = Math.hypot(lng - clng, lat - clat);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  _formatCell(cell) {
    const val = cell.value != null ? Number(cell.value).toFixed(1) : '—';
    const level = cell.level || '—';
    const reason = cell.reason || '—';
    let factors = '';
    if (Array.isArray(cell.factors) && cell.factors.length) {
      factors = `<div style="margin-top:4px;color:#94a3b8">因子：${cell.factors
        .slice(0, 3)
        .map((f) => `${f.name || f.factor}:${f.value ?? '—'}`)
        .join(' · ')}</div>`;
    }
    return `<div><strong>R_met ${val}</strong> · ${level}</div><div>${reason}</div>${factors}`;
  }

  _hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
  }

  async _resolveRegionBounds(regionId) {
    try {
      const regions = await fetchRegions();
      const region = (regions || []).find((r) => (r.regionId || r.id) === regionId);
      if (region?.boundaryUrl) {
        return await fetchGeoJsonEnvelope(region.boundaryUrl);
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async update({ regionId, time, heightM = 100 } = {}) {
    if (!this.viewer || !regionId) {
      this.clear(false);
      return;
    }
    const req = ++this._req;
    try {
      const raw = await fetchRiskHeatmap({ regionId, time, heightM });
      if (req !== this._req) return;

      this.cells = Array.isArray(raw?.cells) ? raw.cells : [];
      const bounds = await this._resolveRegionBounds(regionId);
      if (!bounds || !this.cells.length) {
        this._clearMeshes();
        return;
      }

      const cellsWithHeight = this.cells.map((c) => ({ ...c, heightM }));
      this.volume = buildVolumeFromRegion(bounds, cellsWithHeight, {
        minHeight: 100,
        maxHeight: 2000,
        nz: 8,
      });
      if (!this.volume) return;

      this.isovalue = riskIsovalueFromCells(this.cells);
      this.chunks = createChunkGrid(this.volume, this.divisions);
      this._rebuildMeshes();
    } catch (err) {
      console.warn('[McRiskLayer]', err?.message || err);
    }
  }

  _rebuildMeshes() {
    if (this._destroyed || !this.viewer || !this.volume) return;
    const sampler = createRiskSampler(this.volume);
    const visible = getVisibleChunks(this.viewer, this.chunks, this.enableCulling);
    const visibleIds = new Set(visible.map((c) => c.id));

    for (const [id, record] of this.chunkRecords) {
      if (!visibleIds.has(id)) {
        this._removeChunkPrimitive(id, record);
      }
    }

    for (const chunk of visible) {
      const mesh = this._buildChunkMesh(chunk, sampler);
      this._upsertChunkPrimitive(chunk.id, mesh);
    }

    this._applyPrimitiveVisibility();
    this.viewer.scene.requestRender();
  }

  _buildChunkMesh(chunk, sampler) {
    const dims = chunk.gridDims;
    const field = fillChunkGrid(sampler, dims, chunk.bounds);
    const { positions, indices, triangleCount } = extractIsosurfaceFromGrid(
      field,
      dims,
      this.isovalue
    );

    if (!positions.length) {
      return { positions: [], indices: new Uint32Array(0), vertexCount: 0, triangleCount: 0 };
    }

    const cartesian = new Array(positions.length);
    const { west, south, east, north, minHeight, maxHeight } = chunk.bounds;

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const lon = west + p[0] * (east - west);
      const lat = south + p[1] * (north - south);
      const height = minHeight + p[2] * (maxHeight - minHeight);
      cartesian[i] = Cesium.Cartesian3.fromDegrees(lon, lat, height);
    }

    return {
      positions: cartesian,
      indices: new Uint32Array(indices),
      vertexCount: cartesian.length,
      triangleCount,
    };
  }

  _upsertChunkPrimitive(chunkId, mesh) {
    const existing = this.chunkRecords.get(chunkId);
    if (existing?.primitive) {
      this.viewer.scene.primitives.remove(existing.primitive);
    }

    if (!mesh.vertexCount) {
      if (existing) this.chunkRecords.delete(chunkId);
      return;
    }

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: Cesium.Cartesian3.packArray(mesh.positions, []),
        }),
      },
      indices: mesh.indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromPoints(mesh.positions),
    });

    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(RISK_COLOR),
        },
        id: `mc-rmet-${chunkId}`,
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        closed: false,
        translucent: true,
        flat: true,
      }),
      asynchronous: false,
      show: this.visible,
    });

    this.viewer.scene.primitives.add(primitive);
    this.chunkRecords.set(chunkId, {
      primitive,
      vertexCount: mesh.vertexCount,
      triangleCount: mesh.triangleCount,
    });
  }

  _removeChunkPrimitive(chunkId, record) {
    if (record?.primitive && this.viewer) {
      this.viewer.scene.primitives.remove(record.primitive);
    }
    this.chunkRecords.delete(chunkId);
  }

  _clearMeshes() {
    for (const [id, record] of this.chunkRecords) {
      this._removeChunkPrimitive(id, record);
    }
    this.chunkRecords.clear();
  }

  _applyPrimitiveVisibility() {
    for (const record of this.chunkRecords.values()) {
      if (record?.primitive) record.primitive.show = this.visible;
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this._applyPrimitiveVisibility();
    if (!this.visible) this._hideTooltip();
  }

  clear(removeHandler = true) {
    this._clearMeshes();
    this.cells = [];
    this.volume = null;
    this._hideTooltip();
    if (removeHandler === false) return;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.clear(false);
    this.handler?.destroy();
    this.handler = null;
    if (this._rebuildTimer) {
      clearTimeout(this._rebuildTimer);
      this._rebuildTimer = null;
    }
    if (this._moveEndRemover) {
      this._moveEndRemover();
      this._moveEndRemover = null;
    }
    this.tooltipEl?.remove();
    this.tooltipEl = null;
    this.viewer = null;
  }
}
