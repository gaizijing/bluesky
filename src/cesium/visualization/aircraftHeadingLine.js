import * as Cesium from 'cesium';
import { clamp, offsetLatLonMeters } from '@/cesium/utils/geo';

const HEADING_LINE_LEN_M = 100.0;
const HEADING_MARKER_STEP_M = 5.0;
const HEADING_MARKER_PIXEL_SIZE = 1;
const HEADING_LINE_VISUAL_ELEVATION_M = 2.0;

/** 航向黄点链，随俯仰变化，与 map.js upsertHeadingLine 一致 */
export class AircraftHeadingLineController {
  constructor(viewer) {
    this.viewer = viewer;
    /** @type {Map<string, import('cesium').Entity[]>} */
    this.markersById = new Map();
  }

  setVisible(id, visible) {
    const markers = this.markersById.get(id);
    if (!markers) return;
    markers.forEach((m) => {
      m.show = visible;
    });
  }

  upsert(id, lat, lon, alt, headingDeg, pitchDeg) {
    if (!this.viewer) return;

    const headingForLine = Number(headingDeg || 0);
    const pitchForLine = clamp(Number(pitchDeg || 0), -85.0, 85.0);
    const pitchRad = Cesium.Math.toRadians(pitchForLine);
    const baseAlt = Math.max(0.0, Number(alt || 0)) + HEADING_LINE_VISUAL_ELEVATION_M;
    const lineLen = HEADING_LINE_LEN_M;
    const markerCount = Math.round(lineLen / HEADING_MARKER_STEP_M) + 1;

    let markers = this.markersById.get(id);
    if (!markers) {
      markers = [];
      this.markersById.set(id, markers);
    }

    while (markers.length < markerCount) {
      markers.push(
        this.viewer.entities.add({
          point: {
            pixelSize: HEADING_MARKER_PIXEL_SIZE,
            color: Cesium.Color.fromCssColorString('#FFD400').withAlpha(1.0),
            outlineColor: Cesium.Color.fromCssColorString('#FFF7A3').withAlpha(0.95),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
    }

    while (markers.length > markerCount) {
      const old = markers.pop();
      this.viewer.entities.remove(old);
    }

    for (let i = 0; i < markerCount; i += 1) {
      const d = Math.min(i * HEADING_MARKER_STEP_M, lineLen);
      const horizontalM = d * Math.cos(pitchRad);
      const verticalM = d * Math.sin(pitchRad);
      const ll = offsetLatLonMeters(lat, lon, headingForLine, horizontalM);
      const sampleAlt = Math.max(0.0, baseAlt + verticalM);
      markers[i].position = Cesium.Cartesian3.fromDegrees(ll.lon, ll.lat, sampleAlt);
      markers[i].show = true;
    }
  }

  remove(id) {
    const markers = this.markersById.get(id);
    if (!markers || !this.viewer) return;
    markers.forEach((m) => this.viewer.entities.remove(m));
    this.markersById.delete(id);
  }

  clearAll() {
    if (!this.viewer) return;
    this.markersById.forEach((markers) => {
      markers.forEach((m) => this.viewer.entities.remove(m));
    });
    this.markersById.clear();
  }

  destroy() {
    this.clearAll();
    this.viewer = null;
  }
}
