import { resolveRouteList, resolveRouteDetails } from '@/services/regionCatalog.js';

const ROUTE_LINE = '#7c1d1d';
const ROUTE_GLOW = '#b45309';
const ROUTE_HIGHLIGHT = '#22d3ee';
const ROUTE_DIM = '#64748b';

function matchRouteId(storedId, targetId) {
  if (targetId == null) return false;
  return String(storedId) === String(targetId);
}

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
    this.routeGroups = new Map();
    this.highlightRouteId = null;
    this.visible = true;
    this.onDrillRoute = null;
    this.clickHandler = null;
    this.#bindMapClick();
  }

  setDrillHandler(fn) {
    this.onDrillRoute = typeof fn === 'function' ? fn : null;
  }

  #bindMapClick() {
    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.clickHandler.setInputAction((movement) => {
      if (!this.onDrillRoute) return;
      const picked = this.viewer.scene.pick(movement.position);
      const routeId = this.#resolveRouteId(picked?.id);
      if (routeId) this.onDrillRoute(routeId);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  #resolveRouteId(entity) {
    if (!entity?.properties) return null;
    return entity.properties.routeId?.getValue?.(Cesium.JulianDate.now())
      ?? entity.properties.routeId
      ?? null;
  }

  async load(regionId, ctx) {
    this.clear();
    if (!regionId) return 0;

    const listData = await resolveRouteList(regionId, { page: 1, size: 50 });
    if (ctx?.isStale?.()) return 0;

    const records = Array.isArray(listData?.records) ? listData.records : [];
    if (!records.length) return 0;

    const skipAnalyze = Boolean(ctx?.skipRouteAnalyze);
    const details = await resolveRouteDetails(records, { skipAnalyze });
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
    const group = { entities: [], positions: positions.slice() };

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
          segmentDanger: danger,
        },
      });
      this.entities.push(entity);
      group.entities.push(entity);
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
          waypointDanger: danger,
        },
      });
      this.entities.push(wpEntity);
      group.entities.push(wpEntity);
    });

    this.routeGroups.set(String(routeId), group);
    return true;
  }

  setDimmed(dim = true) {
    if (!dim) {
      this.clearHighlight();
      return;
    }
    this.highlightRouteId = null;
    this.routeGroups.forEach((group) => {
      group.entities.forEach((entity) => this.#applyRouteEntityStyle(entity, { mode: 'dim' }));
    });
    this.viewer?.scene?.requestRender();
  }

  setHighlight(routeId, { fly = false } = {}) {
    this.highlightRouteId = routeId != null ? String(routeId) : null;
    this.routeGroups.forEach((group, id) => {
      const mode = matchRouteId(id, this.highlightRouteId) ? 'highlight' : 'dim';
      group.entities.forEach((entity) => this.#applyRouteEntityStyle(entity, { mode }));
    });
    if (fly && this.highlightRouteId) this.#flyToRoute(this.highlightRouteId);
    this.viewer?.scene?.requestRender();
  }

  clearHighlight() {
    this.highlightRouteId = null;
    this.routeGroups.forEach((group) => {
      group.entities.forEach((entity) => this.#applyRouteEntityStyle(entity, { mode: 'default' }));
    });
    this.viewer?.scene?.requestRender();
  }

  #applyRouteEntityStyle(entity, { mode = 'default' } = {}) {
    const active = mode === 'highlight';
    const dimmed = mode === 'dim';

    if (entity.polyline) {
      const danger = entity.properties?.segmentDanger?.getValue?.(Cesium.JulianDate.now())
        ?? entity.properties?.segmentDanger
        ?? 7;
      if (active) {
        entity.polyline.width = 14;
        entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.32,
          color: Cesium.Color.fromCssColorString(ROUTE_HIGHLIGHT),
        });
        entity.polyline.depthFailMaterial = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.fromCssColorString(ROUTE_HIGHLIGHT).withAlpha(0.9),
        });
      } else if (dimmed) {
        entity.polyline.width = 4;
        entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.05,
          color: Cesium.Color.fromCssColorString(ROUTE_DIM).withAlpha(0.28),
        });
        entity.polyline.depthFailMaterial = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.04,
          color: Cesium.Color.fromCssColorString(ROUTE_DIM).withAlpha(0.2),
        });
      } else {
        entity.polyline.width = 7;
        entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.15,
          color: dangerColor(danger),
        });
        entity.polyline.depthFailMaterial = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.08,
          color: Cesium.Color.fromCssColorString(ROUTE_GLOW).withAlpha(0.85),
        });
      }
      return;
    }

    if (entity.billboard) {
      const danger = entity.properties?.waypointDanger?.getValue?.(Cesium.JulianDate.now())
        ?? entity.properties?.waypointDanger
        ?? 7;
      if (active) {
        entity.billboard.image = waypointIconColor(danger);
        entity.billboard.width = 44;
        entity.billboard.height = 44;
        entity.billboard.color = Cesium.Color.WHITE;
      } else if (dimmed) {
        entity.billboard.width = 28;
        entity.billboard.height = 28;
        entity.billboard.color = Cesium.Color.WHITE.withAlpha(0.35);
      } else {
        entity.billboard.image = waypointIconColor(danger);
        entity.billboard.width = 36;
        entity.billboard.height = 36;
        entity.billboard.color = Cesium.Color.WHITE;
      }
    }
  }

  #flyToRoute(routeId) {
    const group = this.routeGroups.get(String(routeId));
    if (!group?.positions?.length) return;
    const bs = Cesium.BoundingSphere.fromPoints(group.positions);
    this.viewer.camera.flyToBoundingSphere(bs, {
      duration: 1.4,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-35),
        Math.max(bs.radius * 2.4, 1800),
      ),
    });
  }

  setVisible(show) {
    this.visible = show;
    this.entities.forEach((e) => { e.show = show; });
    this.viewer?.scene?.requestRender();
  }

  clear() {
    this.highlightRouteId = null;
    this.routeGroups.clear();
    this.entities.forEach((e) => {
      try {
        this.viewer.entities.remove(e);
      } catch { /* ignore */ }
    });
    this.entities = [];
  }

  destroy() {
    this.clear();
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
  }
}
