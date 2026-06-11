/** 从 ISIM / WebSocket 消息中提取飞机 WGS84 位姿 */
export function extractAircraftPose(data) {
  if (!data || typeof data !== 'object') return null;

  const lon = Number(
    data.aircraftLon ?? data.longitude ?? data.lon ?? data.aircraft_longitude,
  );
  const lat = Number(
    data.aircraftLat ?? data.latitude ?? data.lat ?? data.aircraft_latitude,
  );
  const alt = Number(data.aircraftAlt ?? data.alt ?? data.aircraft_alt ?? 0);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (Math.abs(lat) < 1e-6 && Math.abs(lon) < 1e-6) return null;

  return {
    lon,
    lat,
    alt: Number.isFinite(alt) ? alt : 0,
    heading: Number(data.aircraftHeading ?? data.heading ?? 0),
    roll: Number(data.aircraftRoll ?? data.roll ?? 0),
  };
}
