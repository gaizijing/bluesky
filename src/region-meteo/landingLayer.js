import { resolveLandingPoints } from '@/services/regionCatalog.js';

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

const HIGHLIGHT_PIN_SVG =
  'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">'
    + '<path d="M28 2C15.85 2 6 11.85 6 24c0 15.4 22 38 22 38s22-22.6 22-38C50 11.85 40.15 2 28 2z" fill="#06b6d4" stroke="#fff" stroke-width="3"/>'
    + '<circle cx="28" cy="24" r="10" fill="#fff"/>'
    + '<circle cx="28" cy="24" r="16" fill="none" stroke="#67e8f9" stroke-width="2.5" opacity="0.85"/>'
    + '</svg>',
  );

const LANDING_TYPE_LABEL = { takeoff: '起降点', operation: '作业点' };

function matchLandingId(entry, targetId) {
  if (targetId == null) return false;
  const id = String(targetId);
  return String(entry.id) === id
    || String(entry.point?.landingPointId) === id
    || String(entry.point?.id) === id;
}

function fmt(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(4) : '—';
}

export class LandingPointLayer {
  constructor(viewerInstance, popup) {
    this.viewer = viewerInstance;
    this.popup = popup;
    this.items = [];
    this.dataSource = null;
    this.activeId = null;
    this.clickHandler = null;
    this.mapClickFallback = null;
    this.visible = true;
    this.highlightId = null;
    this.highlightRing = null;
    this.onDrillLanding = null;
    this.#bindMapClick();
  }

  setMapClickFallback(fn) {
    this.mapClickFallback = fn;
  }

  setDrillHandler(fn) {
    this.onDrillLanding = typeof fn === 'function' ? fn : null;
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
      if (landingId) {
        this.showPopup(landingId);
        return;
      }
      if (this.mapClickFallback) {
        this.mapClickFallback(movement);
        return;
      }
      this.hidePopup();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.clickHandler.setInputAction((movement) => {
      const picked = this.viewer.scene.pick(movement.position);
      const landingId = this.#resolveLandingId(picked?.id);
      if (!landingId) return;
      if (this.onDrillLanding) {
        this.hidePopup();
        this.onDrillLanding(landingId);
        return;
      }
      this.#flyToLanding(landingId);
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
      console.warn('[region-meteo-demo] 批量地形采样失败', err);
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

    const list = await resolveLandingPoints(regionId);
    const points = (Array.isArray(list) ? list : []).filter((p) => {
      const lng = Number(p.longitude);
      const lat = Number(p.latitude);
      return Number.isFinite(lng) && Number.isFinite(lat);
    });

    if (!points.length || ctx?.isStale?.()) return points;

    const surfaceHeights = await this.#sampleSurfaceHeights(points);
    if (ctx?.isStale?.()) return [];

    const dataSource = new Cesium.CustomDataSource('landingPoints');
    this.viewer.dataSources.add(dataSource);
    this.dataSource = dataSource;
    dataSource.show = this.visible;
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
    if (!item || !this.popup) return;

    this.activeId = id;
    const point = item.point;
    const enabled = point.enabled !== false;

    this.popup.show(item.anchor, {
      title: point.name || id,
      rows: [
        { text: '编号：' + (point.code || '—') },
        { text: '类型：' + (LANDING_TYPE_LABEL[point.type] || point.type || '—') },
        { text: '地址：' + (point.address || '—') },
        { text: '坐标：' + fmt(Number(point.longitude)) + ', ' + fmt(Number(point.latitude)) },
        {
          text: Number.isFinite(item.surfaceH)
            ? '海拔：' + item.surfaceH.toFixed(1) + ' m（地形采样）'
            : (point.altitude != null ? '海拔：' + point.altitude + ' m' : '海拔：—'),
        },
        {
          html: enabled
            ? '<span class="landing-popup__badge">启用</span>'
            : '<span class="landing-popup__badge is-off">停用</span>',
        },
      ],
    });

    this.items.forEach((entry) => {
      if (entry.entity.billboard) {
        entry.entity.billboard.scale = entry.id === id ? 1.2 : 1.0;
      }
    });
    if (this.highlightId) this.#applyHighlightStyles(this.highlightId);
  }

  hidePopup() {
    this.activeId = null;
    this.popup?.hide();
    if (!this.highlightId) {
      this.#resetLandingStyles();
    } else {
      this.#applyHighlightStyles(this.highlightId);
    }
  }

  setDimmed(dim = true) {
    if (!dim) {
      this.clearHighlight();
      return;
    }
    this.#removeHighlightRing();
    this.items.forEach((entry) => {
      if (entry.entity.billboard) {
        entry.entity.billboard.image = LANDING_PIN_SVG;
        entry.entity.billboard.scale = 0.78;
        entry.entity.billboard.color = Cesium.Color.WHITE.withAlpha(0.32);
      }
      if (entry.entity.label) entry.entity.label.show = false;
    });
    this.viewer?.scene?.requestRender();
  }

  setHighlight(id, { fly = false } = {}) {
    this.highlightId = id != null ? String(id) : null;
    const target = this.#applyHighlightStyles(this.highlightId);
    if (fly && target) this.#flyToLanding(target.id);
    this.viewer?.scene?.requestRender();
  }

  clearHighlight() {
    this.highlightId = null;
    this.#removeHighlightRing();
    this.#resetLandingStyles();
    this.viewer?.scene?.requestRender();
  }

  #resetLandingStyles() {
    this.items.forEach((entry) => {
      if (entry.entity.billboard) {
        entry.entity.billboard.image = LANDING_PIN_SVG;
        entry.entity.billboard.scale = 1.0;
        entry.entity.billboard.color = Cesium.Color.WHITE;
      }
      if (entry.entity.label) {
        entry.entity.label.show = true;
        entry.entity.label.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
        entry.entity.label.pixelOffset = new Cesium.Cartesian2(0, -48);
      }
    });
  }

  #applyHighlightStyles(targetId) {
    this.#removeHighlightRing();
    if (!targetId) {
      this.#resetLandingStyles();
      return null;
    }

    let targetItem = null;
    this.items.forEach((entry) => {
      const match = matchLandingId(entry, targetId);
      if (match) targetItem = entry;
      if (entry.entity.billboard) {
        if (match) {
          entry.entity.billboard.image = HIGHLIGHT_PIN_SVG;
          entry.entity.billboard.scale = 1.42;
          entry.entity.billboard.color = Cesium.Color.WHITE;
        } else {
          entry.entity.billboard.image = LANDING_PIN_SVG;
          entry.entity.billboard.scale = 0.78;
          entry.entity.billboard.color = Cesium.Color.WHITE.withAlpha(0.32);
        }
      }
      if (entry.entity.label) {
        entry.entity.label.show = match;
        if (match) {
          entry.entity.label.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
          entry.entity.label.pixelOffset = new Cesium.Cartesian2(0, -56);
        }
      }
    });

    if (targetItem) this.#addHighlightRing(targetItem);
    return targetItem;
  }

  #addHighlightRing(item) {
    const lng = Number(item.point.longitude);
    const lat = Number(item.point.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    this.highlightRing = this.viewer.entities.add({
      id: 'landing_highlight_ring_' + item.id,
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      ellipse: {
        semiMajorAxis: 140,
        semiMinorAxis: 140,
        height: 0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        material: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.28),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#22d3ee'),
        outlineWidth: 3,
      },
    });
  }

  #removeHighlightRing() {
    if (this.highlightRing) {
      try {
        this.viewer.entities.remove(this.highlightRing);
      } catch { /* ignore */ }
      this.highlightRing = null;
    }
  }

  setVisible(show) {
    this.visible = show;
    if (this.dataSource) this.dataSource.show = show;
    if (!show) this.hidePopup();
  }

  clear() {
    this.hidePopup();
    this.clearHighlight();
    if (this.dataSource) {
      this.viewer.dataSources.remove(this.dataSource, true);
      this.dataSource = null;
    }
    this.items = [];
  }

  destroy() {
    this.clear();
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
  }
}
