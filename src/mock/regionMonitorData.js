// 青岛热点片区监控数据（飞行评分与片区气象特征关联）
export const qingdaoRegionMonitorData = [
  {
    "id": 3,
    "name": "凤凰岛地铁站停机坪",
    "flightScore": [true, true, true, true, true, true, true, true, true, false, false, false],
    "coordinates": [120.1545, 35.9389]
  },

  {
    "id": 6,
    "name": "青岛即墨通用机场",
    "flightScore": [true, true, true, true, true, true, true, true, true, false, false, false],
    "coordinates": [120.5353, 36.5254]
  },
  {
    "id": 7,
    "name": "青岛慈航通用机场",
    "flightScore": [true, true, true, true, true, true, true, false, true, true, true, true],
    "coordinates": [120.2678, 36.9836]
  },
  {
    "id": 8,
    "name": "青岛奥帆中心直升机起降点",
    "flightScore": [true, true, true, true, true, true, true, true, true, false, false, false],
    "coordinates": [120.3417, 36.0650]
  },
  {
    "id": 9,
    "name": "青岛金沙滩临时起降点",
    "flightScore": [true, true, true, true, true, true, true, true, true, false, false, false],
    "coordinates": [120.2667, 35.9333]
  },
  {
    "id": 10,
    "name": "青岛北站临时起降点",
    "flightScore": [true, true, true, true, true, true, false, true, true, false, true, true],
    "coordinates": [120.4458, 36.1750]
  },
  {
    "id": 11,
    "name": "青岛西海岸通用机场",
    "flightScore": [true, true, true, true, true, true, false, true, false, true, true, true],
    "coordinates": [120.1830, 35.9815]
  }
  ,
  {
    "id": 4,
    "name": "青岛胶东国际机场（通用起降区）",
    "flightScore": [true, true, true, true, true, true, false, true, false, true, true, true],
    "coordinates": [120.0515, 36.2142]
  },
  {
    "id": 5,
    "name": "莱西店埠通用机场",
    "flightScore": [true, true, true, true, true, true, true, true, true, false, true, true],
    "coordinates": [120.3614, 36.7121]
  },
];

// 飞行适宜性等级（保持原逻辑）
export const FLIGHT_SUITABILITY_LEVELS = {
  EXCELLENT: { min: 0, max: 30, label: '优秀', color: 'green' },
  GOOD: { min: 31, max: 60, label: '良好', color: 'yellow' },
  POOR: { min: 61, max: 100, label: '较差', color: 'red' }
};

// 获取飞行适宜性等级
export const getFlightSuitabilityLevel = (score) => {
  if (score >= 0 && score <= 30) return FLIGHT_SUITABILITY_LEVELS.EXCELLENT;
  if (score >= 31 && score <= 60) return FLIGHT_SUITABILITY_LEVELS.GOOD;
  return FLIGHT_SUITABILITY_LEVELS.POOR;
};

export default qingdaoRegionMonitorData;