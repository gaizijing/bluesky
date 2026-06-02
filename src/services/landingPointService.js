import {
  fetchLandingPoints,
  createLandingPoint,
} from '@/api';
import { useRegionLandingStore } from '@/store/modules/regionLanding';
import { useRegionStore } from '@/store/modules/region';

export class LandingPointService {
  constructor() {
    this.store = useRegionLandingStore();
    this.regionStore = useRegionStore();
  }

  async loadLandingPoints(regionId) {
    const points = await this.store.loadLandingPoints(regionId);
    return points;
  }

  async loadCurrentLandingPoint() {
    if (!this.store.selectedLandingPoint && this.store.landingPoints.length) {
      this.store.setSelectedLandingPoint(this.store.landingPoints[0]);
    }
    return this.store.selectedLandingPoint;
  }

  async createLandingPoint(areaData) {
    const regionId = areaData.regionId || this.regionStore.regionId;
    const payload = {
      ...areaData,
      regionId,
      address: areaData.location || areaData.address,
    };
    const created = await createLandingPoint(payload);
    const updatedList = [created, ...this.store.landingPoints];
    this.store.setLandingPoints(updatedList);
    return created;
  }

  selectLandingPoint(point) {
    this.store.selectLandingPoint(point);
  }

  // 兼容旧 AreaService 命名
  async loadAreaList() {
    return this.loadLandingPoints();
  }

  async loadCurrentSelectedArea() {
    return this.loadCurrentLandingPoint();
  }

  async createArea(areaData) {
    const bbox = areaData.bbox;
    return this.createLandingPoint({
      name: areaData.name,
      type: areaData.type,
      location: bbox
        ? `${bbox.west.toFixed(2)}, ${bbox.south.toFixed(2)}`
        : areaData.location,
      longitude: bbox ? (bbox.west + bbox.east) / 2 : areaData.longitude,
      latitude: bbox ? (bbox.south + bbox.north) / 2 : areaData.latitude,
      bboxMinLng: bbox?.west,
      bboxMinLat: bbox?.south,
      bboxMaxLng: bbox?.east,
      bboxMaxLat: bbox?.north,
    });
  }

  async updateSelectedArea(areaData) {
    this.selectLandingPoint(areaData);
  }
}

export { LandingPointService as AreaService };
