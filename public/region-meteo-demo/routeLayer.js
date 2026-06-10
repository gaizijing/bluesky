import { apiGet, apiPost } from './api.js';

const ROUTE_LINE = '#7c1d1d';
const ROUTE_GLOW = '#b45309';

function hIconSvg(hex) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">'
    + '<circle cx="22" cy="22" r="18" fill="' + hex + '" stroke="#fff" stroke-width="2.5"/>'
    + '<text x="22" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#fff">H</text>'
    + '</svg>',
  );
}

function waypointDangerAt(index, total, dangers) {
  if (!dangers.length) return 7;
  if (index === 0) return dangers[0] ?? 7;
  if (index === total - 1) return dangers[dangers.length - 1] ?? dangers[dangers.length - 2] ?? 7;
  const left = dangers[index - 1] ?? 0;
  const right = dangers[index] ?? left;
  return Math.max(left, right);
}

function waypointIconColor(danger) {
  const d = Cesium.Math.clamp(Number(danger) || 0, 0, 10);
  if (d < 3) return hIconSvg('#16a34a');
  if (d < 7) return hIconSvg('#ca8a04');
  return hIconSvg('#dc2626');
}

function dangerColor(danger) {
  const d = Cesium.Math.clamp(Number(danger) || 0, 0, 10);
  if (d < 3) return Cesium.Color.fromCssColorString('#16a34a');
  if (d < 7) return Cesium.Color.fromCssColorString('#ca8a04');
  return Cesium.Color.fromCssColorString(ROUTE_LINE);
}

function buildWaypoints(route) {
  const raw = Array.isArray(route?.waypoints) ? route.waypoints : [];
  const flightH = Number(route?.flightHeight) || 300;
  const pts = raw
    .map((wp) => ({
      longitude: Number(wp.longitude ?? wp.lon),
      latitude: Number(wp.latitude ?? wp.lat),
      height: Number(wp.height ?? wp.altitude) || flightH,
    }))
    .filter((p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude));

  if (pts.length >= 2) return pts;

  const segments = Array.isArray(route?.segmentData) ? route.segmentData : [];
  if (!segments.length) return [];

  const out = [];
  const first = segments[0];
  const start = first?.startCoordinates;
  if (Array.isArray(start) && start.length >= 2) {
    out.push({ longitude: Number(start[0]), latitude: Number(start[1]), height: flightH });
  }
  segments.forEach((seg) => {
    const end = seg?.endCoordinates;
    if (Array.isArray(end) && end.length >= 2) {
      out.push({ longitude: Number(end[0]), latitude: Number(end[1]), height: flightH });
    }
  });
  return out.filter((p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude));
}

function enhanceWaypoints(waypoints) {
  if (waypoints.length < 2) return [];
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const startH = start.height || 300;
  const endH = end.height || 300;
  const enhanced = [
    { ...start, height: 0 },
    { ...start, height: startH },
    ...waypoints.slice(1, -1),
    { ...end, height: endH },
    { ...end, height: 0 },
  ];
  return enhanced.map((wp) =>
    Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, wp.height || 0),
  );
}

export class RouteLayer {
  constructor(viewerInstance) {
    this.viewer = viewerInstance;
    this.entities = [];
    this.visible = true;
  }

  async load(regionId, ctx) {
    this.clear();
    if (!regionId) return 0;

    const listData = await apiGet(
      '/routes?regionId=' + encodeURIComponent(regionId) + '&page=1&size=50',
    );
    if (ctx?.isStale?.()) return 0;

    const records = Array.isArray(listData?.records) ? listData.records : [];
    if (!records.length) return 0;

    const details = await Promise.all(
      records.map(async (item) => {
        const routeId = item.routeId || item.id;
        if (!routeId) return null;
        try {
          let detail = await apiGet('/routes/' + encodeURIComponent(routeId));
          if (!Array.isArray(detail?.dangers) || !detail.dangers.length) {
            try {
              const analyzed = await apiPost('/routes/' + encodeURIComponent(routeId) + '/analyze', {});
              detail = { ...detail, ...analyzed };
            } catch {
              /* 无分析结果时使用默认风险色 */
            }
          }
          return detail;
        } catch (err) {
          console.warn('[region-meteo-demo] 航路详情失败', routeId, err);
          return null;
        }
      }),
    );
    if (ctx?.isStale?.()) return 0;

    let count = 0;
    details.filter(Boolean).forEach((route) => {
      if (this.#renderRoute(route)) count += 1;
    });

    this.setVisible(this.visible);
    this.viewer?.scene?.requestRender();
    return count;
  }

  #renderRoute(route) {
    const waypoints = buildWaypoints(route);
    const positions = enhanceWaypoints(waypoints);
    if (positions.length < 2) return false;

    const routeId = route.routeId || route.id;
    const dangers = Array.isArray(route.dangers) ? route.dangers : [];

    for (let i = 0; i < positions.length - 1; i++) {
      const danger = dangers[i] ?? dangers[Math.min(i, dangers.length - 1)] ?? 7;
      const entity = this.viewer.entities.add({
        id: 'route_' + routeId + '_seg_' + i,
        polyline: {
          positions: [positions[i], positions[i + 1]],
          width: 7,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.15,
            color: dangerColor(danger),
          }),
          depthFailMaterial: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.08,
            color: Cesium.Color.fromCssColorString(ROUTE_GLOW).withAlpha(0.85),
          }),
        },
        properties: {
          isRouteSegment: true,
          routeId,
        },
      });
      this.entities.push(entity);
    }

    waypoints.forEach((wp, index) => {
      if (index !== 0 && index !== waypoints.length - 1) return;

      const danger = waypointDangerAt(index, waypoints.length, dangers);
      const wpEntity = this.viewer.entities.add({
        id: 'route_' + routeId + '_wp_' + index,
        position: Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, 0),
        billboard: {
          image: waypointIconColor(danger),
          width: 36,
          height: 36,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(800, 1.1, 120000, 0.75),
        },
        properties: {
          isRouteWaypoint: true,
          routeId,
          waypointIndex: index,
        },
      });
      this.entities.push(wpEntity);
    });

    return true;
  }

  setVisible(show) {
    this.visible = show;
    this.entities.forEach((e) => { e.show = show; });
    this.viewer?.scene?.requestRender();
  }

  clear() {
    this.entities.forEach((e) => {
      try {
        this.viewer.entities.remove(e);
      } catch { /* ignore */ }
    });
    this.entities = [];
  }

  destroy() {
    this.clear();
  }
}
