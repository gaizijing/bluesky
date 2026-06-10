function ringBbox(ring) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of ring) {
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }
  return { west, south, east, north };
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = (yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function normalizePolygons(geojson) {
  const feature = geojson.features?.[0] ?? geojson;
  const geometry = feature.geometry ?? geojson.geometry;
  if (!geometry?.coordinates?.length) {
    throw new Error('Region boundary GeoJSON 缺少 geometry');
  }

  const polygons = [];
  if (geometry.type === 'Polygon') {
    polygons.push(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      polygons.push(poly);
    }
  } else {
    throw new Error('不支持的 geometry 类型: ' + geometry.type);
  }

  return polygons.map((rings) => ({
    rings,
    bbox: ringBbox(rings[0]),
  }));
}

export function createRegionBoundaryMask(geojson) {
  const polygons = normalizePolygons(geojson);
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const poly of polygons) {
    west = Math.min(west, poly.bbox.west);
    south = Math.min(south, poly.bbox.south);
    east = Math.max(east, poly.bbox.east);
    north = Math.max(north, poly.bbox.north);
  }

  function contains(lon, lat) {
    if (lon < west || lon > east || lat < south || lat > north) return false;

    for (const poly of polygons) {
      const { bbox, rings } = poly;
      if (lon < bbox.west || lon > bbox.east || lat < bbox.south || lat > bbox.north) {
        continue;
      }
      if (!pointInRing(lon, lat, rings[0])) continue;
      let inHole = false;
      for (let h = 1; h < rings.length; h++) {
        if (pointInRing(lon, lat, rings[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
    return false;
  }

  function sampleInBBox(westBound, southBound, eastBound, northBound, maxAttempts = 48) {
    for (let i = 0; i < maxAttempts; i++) {
      const lon = westBound + Math.random() * (eastBound - westBound);
      const lat = southBound + Math.random() * (northBound - southBound);
      if (contains(lon, lat)) return { lng: lon, lat };
    }
    return null;
  }

  return {
    polygonCount: polygons.length,
    bbox: { west, south, east, north },
    contains,
    sampleInBBox,
  };
}

export function patchFieldRegionClip(field, regionMask) {
  if (!field || !regionMask || typeof field.contains !== 'function') return;
  const nativeContains = field.contains.bind(field);
  field.contains = function (lon, lat) {
    return nativeContains(lon, lat) && regionMask.contains(lon, lat);
  };
}
