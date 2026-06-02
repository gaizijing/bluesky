import request from '../utils/request';
import { fetchWeatherApi } from "openmeteo";
import { getStorage, setStorage, removeStorage } from '../utils/storageUtils';

const REGION_ID_KEY = 'currentRegionId';
const SELECTED_LANDING_POINT_KEY = 'selectedLandingPointId';
const LEGACY_REGION_ID_KEY = 'v2_regionId';
const LEGACY_SELECTED_KEY = 'v2_selectedLandingPointId';

function readRegionIdFromStorage() {
  const current = getStorage(REGION_ID_KEY);
  if (current && String(current).trim()) return String(current).trim();
  const legacy = getStorage(LEGACY_REGION_ID_KEY);
  if (legacy && String(legacy).trim()) {
    setStorage(REGION_ID_KEY, String(legacy).trim());
    return String(legacy).trim();
  }
  return null;
}

function readSelectedLandingPointId() {
  const current = getStorage(SELECTED_LANDING_POINT_KEY);
  if (current && String(current).trim()) return String(current).trim();
  const legacy = getStorage(LEGACY_SELECTED_KEY);
  if (legacy && String(legacy).trim()) {
    setStorage(SELECTED_LANDING_POINT_KEY, String(legacy).trim());
    return String(legacy).trim();
  }
  return null;
}

const mapLandingPointToLegacyArea = (point) => {
  if (!point) return null;
  const id = point.landingPointId || point.id;
  return {
    ...point,
    id,
    landingPointId: id,
    location: point.address || point.location || '',
    status: point.enabled === false ? 'unavailable' : 'available',
    bboxMinLng: point.bboxMinLng,
    bboxMinLat: point.bboxMinLat,
    bboxMaxLng: point.bboxMaxLng,
    bboxMaxLat: point.bboxMaxLat,
  };
};

const mapRegionToLegacyConfig = (region) => {
  if (!region) return null;
  return {
    ...region,
    id: region.regionId || region.id,
    regionId: region.regionId || region.id,
  };
};

async function resolveRegionId(regionId) {
  const normalized = typeof regionId === 'string' ? regionId.trim() : regionId;
  if (normalized) return normalized;
  const stored = readRegionIdFromStorage();
  if (stored) return stored;
  const def = await request.get('/regions/default');
  const id = def?.regionId || def?.id;
  if (!id) {
    throw new Error('未找到默认区域，请先配置 Region');
  }
  setStorage(REGION_ID_KEY, id);
  return id;
}

// ==================== Region ====================

export const fetchRegions = async () => {
  const data = await request.get('/regions');
  return (Array.isArray(data) ? data : []).map(mapRegionToLegacyConfig);
};

export const fetchDefaultRegion = async () => {
  const data = await request.get('/regions/default');
  return mapRegionToLegacyConfig(data);
};

export const setCurrentRegionId = async (regionId) => {
  setStorage(REGION_ID_KEY, regionId);
  removeStorage(SELECTED_LANDING_POINT_KEY);
  return regionId;
};

// ==================== 起降点（兼容旧 area 命名） ====================

export const fetchAreaList = async (regionId) => {
  const rid = await resolveRegionId(regionId);
  const data = await request.get('/landing-points', { regionId: rid });
  return (Array.isArray(data) ? data : []).map(mapLandingPointToLegacyArea);
};

export const fetchCurrentSelectedArea = async () => {
  const selectedId = readSelectedLandingPointId();
  if (selectedId) {
    try {
      const point = await request.get(`/landing-points/${selectedId}`);
      return mapLandingPointToLegacyArea(point);
    } catch {
      removeStorage(SELECTED_LANDING_POINT_KEY);
      removeStorage(LEGACY_SELECTED_KEY);
    }
  }

  const list = await fetchAreaList();
  if (list.length) {
    setStorage(SELECTED_LANDING_POINT_KEY, list[0].id);
    return list[0];
  }
  return null;
};

export const updateSelectedArea = async (area) => {
  const id = area?.id || area?.landingPointId;
  if (id) {
    setStorage(SELECTED_LANDING_POINT_KEY, id);
  }
  return { pointId: id };
};

export const addNewArea = async (areaData) => {
  try {
    const regionId = await resolveRegionId(areaData.regionId);
    const payload = {
      regionId,
      name: areaData.name,
      code: areaData.code,
      type: areaData.type,
      address: areaData.location || areaData.address,
      longitude: areaData.longitude,
      latitude: areaData.latitude,
      altitude: areaData.altitude,
      bboxMinLng: areaData.bboxMinLng ?? areaData.bbox?.west,
      bboxMinLat: areaData.bboxMinLat ?? areaData.bbox?.south,
      bboxMaxLng: areaData.bboxMaxLng ?? areaData.bbox?.east,
      bboxMaxLat: areaData.bboxMaxLat ?? areaData.bbox?.north,
      enabled: areaData.enabled !== false && areaData.status !== 'unavailable',
    };
    const data = await request.post('/landing-points', payload);
    return mapLandingPointToLegacyArea(data);
  } catch (error) {
    console.error('添加起降点失败:', error);
    throw error;
  }
};

export const updateMonitoringPoint = async (id, areaData) => {
  try {
    const regionId = await resolveRegionId(areaData.regionId);
    const payload = {
      regionId,
      name: areaData.name,
      code: areaData.code,
      type: areaData.type,
      address: areaData.location || areaData.address,
      longitude: areaData.longitude,
      latitude: areaData.latitude,
      altitude: areaData.altitude,
      bboxMinLng: areaData.bboxMinLng,
      bboxMinLat: areaData.bboxMinLat,
      bboxMaxLng: areaData.bboxMaxLng,
      bboxMaxLat: areaData.bboxMaxLat,
      enabled: areaData.enabled !== false && areaData.status !== 'unavailable',
    };
    const data = await request.put(`/landing-points/${id}`, payload);
    return mapLandingPointToLegacyArea(data);
  } catch (error) {
    console.error('更新起降点失败:', error);
    throw error;
  }
};

export const deleteLandingPoint = async (id) => {
  try {
    await request.delete(`/landing-points/${id}`);
    const selectedId = readSelectedLandingPointId();
    if (selectedId === id) {
      removeStorage(SELECTED_LANDING_POINT_KEY);
    }
    return true;
  } catch (error) {
    console.error('删除起降点失败:', error);
    throw error;
  }
};

export const fetchLandingPoints = async (regionId) => fetchAreaList(regionId);

export const createLandingPoint = async (areaData) => addNewArea(areaData);

export const updateLandingPoint = async (id, areaData) => updateMonitoringPoint(id, areaData);

export const deleteMonitoringPoint = deleteLandingPoint;
export const getWeatherSuitability = async (params = {}) => {

  const {
    currentPoint,
    timestamp = new Date(),
    timeRange = '3h',
    includeThresholds = true
  } = params;

  // 获取点ID
  let pointId = null;
  if (currentPoint) {
    pointId = currentPoint.id || currentPoint.pointId;
  }

  // 构建API请求参数
  const queryParams = new URLSearchParams();
  if (pointId) queryParams.append('pointId', pointId);
  queryParams.append('timestamp', timestamp.toISOString());
  queryParams.append('timeRange', timeRange);
  if (includeThresholds) queryParams.append('includeThresholds', 'true');

  // 尝试调用真实API - 注意：后端路径是 /suitability/status
  // 使用提取的pointId，而不是currentPoint对象
  const url = `/suitability/status?pointId=${encodeURIComponent(pointId || 'area-1')}&totalHours=3`;

  const response = await request.get(url);
  return response


}


export const getWeatherForecastTrend = async (pointId) => {
  try {
  
    
    if (!pointId) {
      throw new Error('未提供重点关注区域ID');
    }
    
    // 构建API请求参数
    const url = `/weather/forecast-trend?pointId=${pointId}`;
    
    // 调用后端接口
    const response = await request.get(url);
    
    // 检查返回数据格式
    if (response && response.data) {
      console.log("\nMinutely15 data:\n", response.data);
      return response.data;
    }
    
    throw new Error('API返回数据格式错误');
  } catch (error) {
    console.error('获取天气趋势数据失败:', error);
    throw error;
  }
}
/**
 * 遵循和风天气API规范，获取实时天气数据
 * 核心规范：HTTPS协议 + 请求头传API Key + Gzip解压 + 专属Host
 * @param {Object} currentPoint - 重点关注区域对象
 * @param {Array} currentPoint.coordinates - 经纬度数组 [经度, 纬度]
 * @param {string} [apiHost] - 你的专属API Host（从和风控制台“设置”中获取）
 * @returns {Promise<Object>} 格式化后的天气数据
 */
export const fetchBasicWeatherDataFromAPI = async (currentPoint) => {

  if (!currentPoint) {
    throw new Error('未选择重点关注区域');
  }

  // 适配后端返回的数据格式：可能是 coordinates 数组，也可能是 longitude/latitude 分开
  let longitude, latitude;
  if (currentPoint.coordinates && Array.isArray(currentPoint.coordinates)) {
    [longitude, latitude] = currentPoint.coordinates;
  } else if (currentPoint.longitude !== undefined && currentPoint.latitude !== undefined) {
    longitude = currentPoint.longitude;
    latitude = currentPoint.latitude;
  } else {
    throw new Error('坐标信息缺失');
  }

  // 2. API核心配置（使用代理避免跨域）
  const API_KEY = import.meta.env.VITE_QWEATHER_API_KEY;

  // 使用代理路径（vite.config.js中配置）
  const proxyUrl = `/weather/now?location=${longitude},${latitude}&key=${API_KEY}`;

  try {
    const response = await axios.get(proxyUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.now) {
      console.log('[Weather] API调用成功:', response.data.now);
      return response.data.now;
    }
  } catch (apiError) {
    console.warn('[Weather] API调用失败:', apiError.message);
  }



};




/**
 * 按经纬度获取实时天气（起降点弹窗等）
 * GET /weather/by-coords?lng=&lat=
 * 响应经 axios 拦截器后一般为 { updateTime, location, data: { windSpeed, vis, ... } }
 */
export const getWeatherByCoords = async (lng, lat) => {
  const lngN = Number(lng)
  const latN = Number(lat)
  if (!Number.isFinite(lngN) || !Number.isFinite(latN)) {
    throw new Error('无效坐标')
  }
  const data = await request.get(
    `/weather/by-coords?lng=${encodeURIComponent(lngN)}&lat=${encodeURIComponent(latN)}`
  )
  return data
}

/**
 * 批量按经纬度获取实时天气（航迹风况剖面等）。
 * POST /weather/by-coords/batch
 * Body: { coordinates: [ { lng, lat }, ... ] }，最多 400 点；服务端对 4 位小数坐标去重。
 * 成功时拦截器返回 data：{ updateTime, count, uniqueQueries, series }
 */
export const postWeatherByCoordsBatch = async (body) => {
  const data = await request.post('/weather/by-coords/batch', body)
  return data
}

// 主函数：获取当前监测点天气数据（调用后端接口）
export const fetchCurrentPointWeather = async (pointId) => {
  try {

    // 调用后端实时天气接口
    const data = await request.get(`/weather/realtime?pointId=${pointId}`);
    // 适配前端期望的格式
    if (data) {
      const weatherData = data;
      return {
        temp: weatherData.temp?.toString() || '25',
        feelsLike: weatherData.feelsLike?.toString() || '24',
        icon: weatherData.icon?.toString() || '100',
        text: weatherData.text || '晴',
        wind360: weatherData.wind360?.toString() || '45',
        windDir: weatherData.windDir || '东北风',
        windScale: weatherData.windScale?.toString() || '3',
        windSpeed: weatherData.windSpeed?.toString() || '12',
        humidity: weatherData.humidity?.toString() || '68',
        precip: weatherData.precip?.toString() || '0.0',
        pressure: weatherData.pressure?.toString() || '1013',
        vis: weatherData.vis?.toString() || '10',
        cloud: weatherData.cloud?.toString() || '25',
        dew: weatherData.dew?.toString() || '18',
        windShearLevel: weatherData.windShearLevel || 'low',
        stabilityIndex: weatherData.stabilityIndex || 'C',
        obsTime: weatherData.obsTime || new Date().toISOString()
      };
    }

    // 如果后端没有数据，抛出错误
    throw new Error('后端返回数据为空');

  } catch (error) {
    console.error('获取当前重点关注区域天气数据失败:', error);
    throw error; // 不返回模拟数据，直接抛出错误
  }
}
// 获取区域飞行风险热力图数据
/**
 * 格式化边界框为API需要的字符串格式
 * @param {Array|Object} bounds - 边界框数据
 * @returns {string} 格式化的边界字符串
 */
const formatBoundsForApi = (bounds) => {
  try {
    if (Array.isArray(bounds)) {
      // 已经是数组格式
      if (bounds.length >= 4) {
        // 直接返回 [minLng,minLat,maxLng,maxLat] 格式
        return `[${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}]`;
      }
    } else if (bounds && typeof bounds === 'object') {
      // 对象格式，尝试提取坐标
      if (bounds.coordinates && Array.isArray(bounds.coordinates)) {
        return formatBoundsForApi(bounds.coordinates);
      } else if (bounds.bounds && Array.isArray(bounds.bounds)) {
        return formatBoundsForApi(bounds.bounds);
      }
    }

    // 无法识别的格式
    console.warn('无法识别的边界框格式:', bounds);
    return null;
  } catch (error) {
    console.error('格式化边界框失败:', error);
    return null;
  }
};

// 获取全市范围热力图数据
export const getCitywideHeatmap = async () => {
  console.log('[全市热力图] 获取全市热力图数据');
  const url = `/weather/heatmap/citywide`;
  const response = await request.get(url);
  console.log('[全市热力图] API调用成功', response);

  if (response && response.data) {
    return response.data;
  }
};


// 获取风险预警数据
export const getRiskWarnings = async (params = {}) => {
  try {
    const { pointId, timeRange } = params;
    let url = '/weather/risk/report';
    const queryParams = [];
    if (pointId) queryParams.push(`pointId=${pointId}`);
    if (timeRange) {
      queryParams.push(`timeRange=${timeRange}`);
    } else {
      // 如果未提供timeRange，使用2026年3月份整个范围作为默认值
      const defaultTimeRange = `2026-03-01 00:00:00,2026-03-31 23:59:59`;
      queryParams.push(`timeRange=${encodeURIComponent(defaultTimeRange)}`);
    }
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    const data = await request.get(url);
    return data;
  } catch (error) {
    console.error('获取风险预警数据失败：', error);
    throw error;
  }
}


export const getWeatherHeatmapGeo = async (params = {}) => {
  try {
    const {
      time,
      pointId
    } = params;
    if (!pointId) {
      throw new Error('监测点ID参数(pointId)是必需的');
    }

    // 构建API请求参数
    const queryParams = new URLSearchParams();
    queryParams.append('pointId', pointId);
    // if (time) queryParams.append('time', time.toISOString ? time.toISOString() : time);

    const url = `/weather/heatmap/geo?${queryParams.toString()}`;
    console.log('调用地理空间热力图API:', url);

    const response = await request.get(url);
    if (response && response.data) {
      console.log('地理空间热力图API调用成功');
      return response.data;
    } else {
      throw new Error('API返回数据格式错误');
    }
  } catch (error) {
    console.error('获取地理空间热力图数据失败:', error);
    throw error;
  }
}

// 获取风场数据
export const getWindData = async () => {
  const data = await request.get('/wind-field');
  return data;
}

// ==================== 地区配置管理接口 ====================

// 获取地区配置信息（默认 Region）
export const getRegionConfig = async () => {
  try {
    const region = await fetchDefaultRegion();
    return {
      regionId: region.regionId,
      defaultName: region.name,
      name: region.name,
      modelUrl: region.modelUrl,
      mapLift: region.mapLift,
      bounds: {
        west: region.west,
        east: region.east,
        south: region.south,
        north: region.north,
      },
    };
  } catch (error) {
    console.error('获取 Region 配置失败:', error);
    throw error;
  }
};

// 获取所有 Region（兼容旧 region-config 命名）
export const getAllRegionConfigs = async () => {
  try {
    return await fetchRegions();
  } catch (error) {
    console.error('获取 Region 列表失败:', error);
    throw error;
  }
};

// 获取默认 Region
export const getDefaultRegionConfig = async () => {
  try {
    return await fetchDefaultRegion();
  } catch (error) {
    console.error('获取默认 Region 失败:', error);
    throw error;
  }
};

// 根据 ID 获取 Region
export const getRegionConfigById = async (id) => {
  try {
    const response = await request.get(`/regions/${id}`);
    return mapRegionToLegacyConfig(response);
  } catch (error) {
    console.error('获取 Region 详情失败:', error);
    throw error;
  }
};

// 创建 Region
export const addRegionConfig = async (data) => {
  try {
    const payload = {
      name: data.name,
      west: data.west,
      east: data.east,
      south: data.south,
      north: data.north,
      centerLng: data.centerLng ?? (data.west + data.east) / 2,
      centerLat: data.centerLat ?? (data.south + data.north) / 2,
      modelUrl: data.modelUrl,
      enabled: data.enabled !== false,
      isDefault: Boolean(data.isDefault),
    };
    const response = await request.post('/regions', payload);
    return mapRegionToLegacyConfig(response);
  } catch (error) {
    console.error('添加 Region 失败:', error);
    throw error;
  }
};

// 设为默认 Region（专用接口，避免 PUT 全量更新失败）
export const setRegionDefault = async (regionId) => {
  const data = await request.put(`/regions/${regionId}/default`);
  return mapRegionToLegacyConfig(data);
};

// 更新 Region
export const updateRegionConfig = async (data) => {
  try {
    const regionId = data.regionId || data.id;
    const west = Number(data.west);
    const east = Number(data.east);
    const south = Number(data.south);
    const north = Number(data.north);
    const payload = {
      name: data.name,
      west,
      east,
      south,
      north,
      centerLng: data.centerLng ?? (west + east) / 2,
      centerLat: data.centerLat ?? (south + north) / 2,
      modelUrl: data.modelUrl,
      enabled: data.enabled !== false,
      isDefault: Boolean(data.isDefault),
    };
    const response = await request.put(`/regions/${regionId}`, payload);
    return mapRegionToLegacyConfig(response);
  } catch (error) {
    console.error('更新 Region 失败:', error);
    throw error;
  }
};

// 删除 Region
export const deleteRegionConfig = async (id) => {
  try {
    await request.delete(`/regions/${id}`);
    return true;
  } catch (error) {
    console.error('删除 Region 失败:', error);
    throw error;
  }
};

// ==================== 设备监测接口 ====================

// 获取设备统计
export const getDeviceCount = async () => {
  try {
    const data = await request.get('/devices/count');
    return data;
  } catch (error) {
    console.error('获取设备统计失败:', error);
    throw error;
  }
}

// 获取设备告警
export const getDeviceAlarms = async (params = {}) => {
  try {
    const { date, level, limit } = params;
    let url = '/devices/alarms';
    const queryParams = [];
    if (date) queryParams.push(`date=${date}`);
    if (level) queryParams.push(`level=${level}`);
    if (limit) queryParams.push(`limit=${limit}`);
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    const data = await request.get(url);
    return data;
  } catch (error) {
    console.error('获取设备告警失败:', error);
    throw error;
  }
}

// 获取设备历史数据
export const getDeviceHistory = async () => {
  try {
    const data = await request.get('/devices/history');
    return data;
  } catch (error) {
    console.error('获取设备历史数据失败:', error);
    throw error;
  }
}

// 获取所有设备列表
export const getDeviceList = async () => {
  try {
    const data = await request.get('/devices/list');
    return data;
  } catch (error) {
    console.error('获取设备列表失败:', error);
    throw error;
  }
}

// 获取在线设备列表
export const getOnlineDevices = async () => {
  try {
    const data = await request.get('/devices/online');
    return data;
  } catch (error) {
    console.error('获取在线设备列表失败:', error);
    throw error;
  }
}

// 根据设备类型获取设备列表
export const getDevicesByType = async (type) => {
  try {
    const data = await request.get(`/devices/by-type/${encodeURIComponent(type)}`);
    return data;
  } catch (error) {
    console.error('按类型获取设备列表失败:', error);
    throw error;
  }
}

// 根据ID获取指定设备
export const getDeviceById = async (id) => {
  try {
    const data = await request.get(`/devices/${id}`);
    return data;
  } catch (error) {
    console.error('获取设备详情失败:', error);
    throw error;
  }
}

// 添加设备
export const createDevice = async (data) => {
  try {
    const response = await request.post('/devices', data);
    return response;
  } catch (error) {
    console.error('新增设备失败:', error);
    throw error;
  }
}

// 更新设备
export const updateDevice = async (id, data) => {
  try {
    const response = await request.put(`/devices/${id}`, data);
    return response;
  } catch (error) {
    console.error('更新设备失败:', error);
    throw error;
  }
}

// 删除设备
export const deleteDevice = async (id) => {
  try {
    const response = await request.delete(`/devices/${id}`);
    return response;
  } catch (error) {
    console.error('删除设备失败:', error);
    throw error;
  }
}

// ==================== 摄像头接口 ====================

// 获取摄像头列表
export const getCameras = async (params = {}) => {
  try {
    const data = await request.get('/cameras', params);
    return data;
  } catch (error) {
    console.error('获取摄像头列表失败:', error);
    throw error;
  }
}

// 创建摄像头
export const createCamera = async (data) => {
  try {
    const response = await request.post('/cameras', data);
    return response;
  } catch (error) {
    console.error('创建摄像头失败:', error);
    throw error;
  }
}

// 根据 ID 获取摄像头详情
export const getCameraById = async (id) => {
  try {
    const data = await request.get(`/cameras/${id}`);
    return data;
  } catch (error) {
    console.error('获取摄像头详情失败:', error);
    throw error;
  }
}

// 更新摄像头
export const updateCamera = async (id, data) => {
  try {
    const response = await request.put(`/cameras/${id}`, data);
    return response;
  } catch (error) {
    console.error('更新摄像头失败:', error);
    throw error;
  }
}

// 删除摄像头
export const deleteCamera = async (id) => {
  try {
    const response = await request.delete(`/cameras/${id}`);
    return response;
  } catch (error) {
    console.error('删除摄像头失败:', error);
    throw error;
  }
}

// 获取摄像头预览图地址
export const getCameraPreview = async (id) => {
  try {
    const data = await request.get(`/cameras/${id}/preview`);
    return data;
  } catch (error) {
    console.error('获取摄像头预览地址失败:', error);
    throw error;
  }
}

// 获取摄像头流地址
export const getCameraStream = async (id) => {
  try {
    const data = await request.get(`/cameras/${id}/stream`);
    return data;
  } catch (error) {
    console.error('获取摄像头流地址失败:', error);
    throw error;
  }
}

// 更新摄像头启用状态
export const updateCameraActive = async (id, active) => {
  try {
    const response = await request.put(`/cameras/${id}/active`, null, {
      params: {
        active
      }
    });
    return response;
  } catch (error) {
    console.error('更新摄像头启用状态失败:', error);
    throw error;
  }
}

// ==================== 航路分析接口 ====================

// 获取航路列表
export const getRoutes = async (regionId) => fetchRoutes(regionId);

// 获取航路列表
export const fetchRoutes = async (regionId, page = 1, size = 20) => {
  const rid = await resolveRegionId(regionId);
  return request.get('/routes', { regionId: rid, page, size });
};

// 获取航路详情
export const getRouteDetail = async (routeId, routeVersionId) => {
  try {
    const params = routeVersionId ? { routeVersionId } : {};
    const data = await request.get(`/routes/${routeId}`, params);
    return data;
  } catch (error) {
    console.error('获取航路详情失败:', error);
    throw error;
  }
};

// 创建新航线
export const createRoute = async (routeData, regionId) => {
  try {
    const rid = await resolveRegionId(regionId || routeData?.regionId);
    const data = await request.post('/routes', routeData, { params: { regionId: rid } });
    return data;
  } catch (error) {
    console.error('创建航线失败:', error);
    throw error;
  }
};

// 导入 GeoJSON 航路
export const importRoute = async (regionId, geoJson) => {
  const rid = await resolveRegionId(regionId);
  return request.post('/routes/import', geoJson, { params: { regionId: rid } });
};

// 分析航线风险
export const analyzeRouteRisk = async (routeId, params = {}) => {
  try {
    const data = await request.post(`/routes/${routeId}/analyze`, params);
    return data;
  } catch (error) {
    console.error('分析航线风险失败:', error);
    throw error;
  }
};

// 按 Region 清空航线
export const clearRoutes = async (regionId) => {
  try {
    const rid = await resolveRegionId(regionId);
    await request.delete('/routes', { regionId: rid });
    return true;
  } catch (error) {
    console.error('清空航线失败:', error);
    throw error;
  }
};

/** 风险区列表（禁飞 / 谨慎圆柱） */
export const getRiskZones = async () => {
  try {
    const data = await request.get('/risk-zones');
    return data;
  } catch (error) {
    console.error('获取风险区失败:', error);
    throw error;
  }
};

// ==================== 阈值管理接口 ====================

// 获取所有阈值配置
export const getAllThresholds = async () => {
  try {
    const data = await request.get('/aircraft-limits/list');
    return data;
  } catch (error) {
    console.error('获取阈值配置失败:', error);
    throw error;
  }
};

// 根据ID获取阈值配置
export const getThresholdById = async (id) => {
  try {
    const data = await request.get(`/aircraft-limits/${id}`);
    return data;
  } catch (error) {
    console.error('获取阈值配置失败:', error);
    throw error;
  }
};

// 根据飞行器ID获取阈值配置
export const getThresholdByAircraftId = async (aircraftId) => {
  try {
    const data = await request.get(`/aircraft-limits/aircraft/${aircraftId}`);
    return data;
  } catch (error) {
    console.error('获取飞行器阈值配置失败:', error);
    throw error;
  }
};

// 获取默认阈值配置
export const getDefaultThreshold = async () => {
  try {
    const data = await request.get('/aircraft-limits/default');
    return data;
  } catch (error) {
    console.error('获取默认阈值配置失败:', error);
    throw error;
  }
};

// 更新默认阈值配置
export const updateDefaultThreshold = async (data) => {
  try {
    const response = await request.put('/aircraft-limits/default', data);
    return response;
  } catch (error) {
    console.error('更新默认阈值配置失败:', error);
    throw error;
  }
};

// 添加阈值配置
export const addThreshold = async (data) => {
  try {
    const response = await request.post('/aircraft-limits', data);
    return response;
  } catch (error) {
    console.error('添加阈值配置失败:', error);
    throw error;
  }
};

// 更新阈值配置
export const updateThreshold = async (data) => {
  try {
    const response = await request.put('/aircraft-limits', data);
    return response;
  } catch (error) {
    console.error('更新阈值配置失败:', error);
    throw error;
  }
};

// 删除阈值配置
export const deleteThreshold = async (id) => {
  try {
    const response = await request.delete(`/aircraft-limits/${id}`);
    return response;
  } catch (error) {
    console.error('删除阈值配置失败:', error);
    throw error;
  }
};

// ==================== 飞行器管理接口 ====================

// 获取所有飞行器模型
export const getAllAircraftModels = async () => {
  try {
    const data = await request.get('/aircraft-models/list');
    return data;
  } catch (error) {
    console.error('获取飞行器模型列表失败:', error);
    throw error;
  }
};

// 获取启用的飞行器模型
export const getActiveAircraftModels = async () => {
  try {
    const data = await request.get('/aircraft-models/active');
    return data;
  } catch (error) {
    console.error('获取启用的飞行器模型失败:', error);
    throw error;
  }
};

// 根据ID获取飞行器模型
export const getAircraftModelById = async (id) => {
  try {
    const data = await request.get(`/aircraft-models/${id}`);
    return data;
  } catch (error) {
    console.error('获取飞行器模型失败:', error);
    throw error;
  }
};

// 添加飞行器模型
export const addAircraftModel = async (data) => {
  try {
    const response = await request.post('/aircraft-models', data);
    return response;
  } catch (error) {
    console.error('添加飞行器模型失败:', error);
    throw error;
  }
};

// 更新飞行器模型
export const updateAircraftModel = async (data) => {
  try {
    const response = await request.put('/aircraft-models', data);
    return response;
  } catch (error) {
    console.error('更新飞行器模型失败:', error);
    throw error;
  }
};

// 删除飞行器模型
export const deleteAircraftModel = async (id) => {
  try {
    const response = await request.delete(`/aircraft-models/${id}`);
    return response;
  } catch (error) {
    console.error('删除飞行器模型失败:', error);
    throw error;
  }
};

// ==================== 用户管理接口 ====================

// 获取用户列表
export const getUserList = async () => {
  try {
    const data = await request.get('/users/list');
    return data;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    throw error;
  }
};

// 根据 ID 获取用户详情
export const getUserById = async (id) => {
  try {
    const data = await request.get(`/users/${id}`);
    return data;
  } catch (error) {
    console.error('获取用户详情失败:', error);
    throw error;
  }
};

// 创建用户
export const createUser = async (data) => {
  try {
    const response = await request.post('/users', data);
    return response;
  } catch (error) {
    console.error('创建用户失败:', error);
    throw error;
  }
};

// 注册用户
export const registerUser = async (data) => {
  try {
    const response = await request.post('/users/register', data);
    return response;
  } catch (error) {
    console.error('注册用户失败:', error);
    throw error;
  }
};

// 更新用户
export const updateUser = async (id, data) => {
  try {
    const response = await request.put(`/users/${id}`, data);
    return response;
  } catch (error) {
    console.error('更新用户失败:', error);
    throw error;
  }
};

// 删除用户
export const deleteUser = async (id) => {
  try {
    const response = await request.delete(`/users/${id}`);
    return response;
  } catch (error) {
    console.error('删除用户失败:', error);
    throw error;
  }
};

// 更新用户状态
export const updateUserStatus = async (id, status) => {
  try {
    const response = await request.put(`/users/${id}/status`, null, {
      params: {
        status
      }
    });
    return response;
  } catch (error) {
    console.error('更新用户状态失败:', error);
    throw error;
  }
};

// 修改当前登录用户密码
export const changeUserPassword = async (oldPassword, newPassword) => {
  try {
    const response = await request.put(
      '/users/change-password',
      {},
      {
        params: {
          oldPassword,
          newPassword
        }
      }
    );
    return response;
  } catch (error) {
    console.error('修改用户密码失败:', error);
    throw error;
  }
};
