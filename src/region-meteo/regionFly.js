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

export function flyToRegion(viewer, region) {
  const lift = region.mapLift || {};
  const boundaryDataSource = getBoundaryDataSource();

  if (boundaryDataSource) {
    const positions = collectBoundaryPositions();
    if (positions.length) {
      const bs = Cesium.BoundingSphere.fromPoints(positions);
      flyToBoundingSphereWithPitch(viewer, bs, bs.radius * FLY_RANGE.rangeFactor);
      return;
    }
    viewer.flyTo(boundaryDataSource, { duration: FLY_RANGE.durationS });
    return;
  }

  const centerLng = lift.longitude ?? region.centerLng;
  const centerLat = lift.latitude ?? region.centerLat;
  if (centerLng != null && centerLat != null) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        centerLng,
        centerLat,
        capFlyRange(lift.height ?? 18000),
      ),
      orientation: {
        heading: Cesium.Math.toRadians(lift.heading ?? 0),
        pitch: Cesium.Math.toRadians(lift.pitch ?? FLY.pitchDeg),
        roll: 0,
      },
      duration: FLY_RANGE.durationS,
    });
  }
}
