/**
 * Build KML document (track only) from WGS84 samples.
 * @param {Array<{lon:number,lat:number,alt:number}>} pathSamples
 * @param {string} name Placemark name
 */
export function buildKmlLineString(pathSamples, name = 'PlannedRoute') {
  const coords = pathSamples
    .map((p) => `${p.lon},${p.lat},${p.alt ?? 0}`)
    .join(' ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(name)}</name>
    <Placemark>
      <name>${escapeXml(name)}</name>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function downloadKml(content, filename = 'route.kml') {
  const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
