import {
  collectBoundaryPositions,
  getBoundaryDataSource,
  FLY,
} from './boundary.js';

const FLY_RANGE = {
  rangeFactor: 1.5,
  rangeMinM: 2500,
  rangeMaxM: 28000,
  durationS: 1.6,
};

const LOG_PREFIX = '[Dashboard/Camera]';

function capFlyRange(rangeMeters) {
  return Math.min(Math.max(rangeMeters, FLY_RANGE.rangeMinM), FLY_RANGE.rangeMaxM);
}

function flyToBoundingSphereWithPitch(viewer, boundingSphere, rangeMeters, duration) {
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: duration ?? FLY_RANGE.durationS,
    offset: new Cesium.HeadingPitchRange(
      0,
      Cesium.Math.toRadians(FLY.pitchDeg),
      capFlyRange(rangeMeters),
    ),
  });
}

function resolveRegionCenter(region) {
  const lift = region?.mapLift || {};
  const centerLng = region?.centerLng ?? lift.longitude;
  const centerLat = region?.centerLat ?? lift.latitude;
  if (centerLng == null || centerLat == null) return null;
  return {
    centerLng,
    centerLat,
    lift,
    source: region.centerLng != null ? 'centerLng/centerLat' : 'mapLift',
  };
}

function flyToRegionCenter(viewer, region) {
  const center = resolveRegionCenter(region);
  if (!center) return false;

  console.log(LOG_PREFIX, 'flyToRegion 使用中心点（忽略边界）', {
    regionId: region.regionId,
    centerLng: center.centerLng,
    centerLat: center.centerLat,
    height: center.lift.height ?? 18000,
    source: center.source,
  });

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      center.centerLng,
      center.centerLat,
      capFlyRange(center.lift.height ?? 18000),
    ),
    orientation: {
      heading: Cesium.Math.toRadians(center.lift.heading ?? 0),
      pitch: Cesium.Math.toRadians(center.lift.pitch ?? FLY.pitchDeg),
      roll: 0,
    },
    duration: FLY_RANGE.durationS,
  });
  return true;
}

function flyToRegionBoundary(viewer, region) {
  const boundaryDataSource = getBoundaryDataSource();
  if (!boundaryDataSource) return false;

  const positions = collectBoundaryPositions();
  if (positions.length) {
    const bs = Cesium.BoundingSphere.fromPoints(positions);
    console.log(LOG_PREFIX, 'flyToRegion 回退到边界包络', {
      regionId: region.regionId,
      pointCount: positions.length,
      radiusM: bs.radius,
    });
    flyToBoundingSphereWithPitch(viewer, bs, bs.radius * FLY_RANGE.rangeFactor);
    return true;
  }

  console.log(LOG_PREFIX, 'flyToRegion 回退到边界 DataSource', {
    regionId: region.regionId,
  });
  viewer.flyTo(boundaryDataSource, { duration: FLY_RANGE.durationS });
  return true;
}

export function flyToRegion(viewer, region) {
  if (!viewer) {
    console.warn(LOG_PREFIX, 'flyToRegion 跳过: viewer 未初始化');
    return;
  }

  if (flyToRegionCenter(viewer, region)) return;

  if (flyToRegionBoundary(viewer, region)) return;

  console.warn(LOG_PREFIX, 'flyToRegion 跳过: 无中心点且无边界', {
    regionId: region?.regionId,
    centerLng: region?.centerLng,
    centerLat: region?.centerLat,
  });
}
