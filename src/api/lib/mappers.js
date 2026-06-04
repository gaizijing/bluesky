export function mapLandingPointToLegacyArea(point) {
  if (!point) return null;
  const id = point.landingPointId || point.id;
  const lng = Number(point.longitude ?? point.lng);
  const lat = Number(point.latitude ?? point.lat);
  const bbox =
    point.bbox ||
    (point.bboxMinLng != null
      ? {
          west: Number(point.bboxMinLng),
          south: Number(point.bboxMinLat),
          east: Number(point.bboxMaxLng),
          north: Number(point.bboxMaxLat),
        }
      : null);
  return {
    ...point,
    id,
    landingPointId: id,
    longitude: Number.isFinite(lng) ? lng : point.longitude,
    latitude: Number.isFinite(lat) ? lat : point.latitude,
    location: point.address || point.location || '',
    status: point.enabled === false ? 'unavailable' : 'available',
    bbox,
    bboxMinLng: point.bboxMinLng,
    bboxMinLat: point.bboxMinLat,
    bboxMaxLng: point.bboxMaxLng,
    bboxMaxLat: point.bboxMaxLat,
  };
}

export function mapRegionToLegacyConfig(region) {
  if (!region) return null;
  return {
    ...region,
    id: region.regionId || region.id,
    regionId: region.regionId || region.id,
  };
}
