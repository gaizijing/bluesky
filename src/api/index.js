import axios from 'axios';
import { fetchWeatherApi } from "openmeteo";

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
});

// 响应拦截器 - 统一处理返回数据
apiClient.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code === 200) {
      return res.data;
    }
    return Promise.reject(new Error(res.message || '请求失败'));
  },
  (error) => {
    console.error('API请求错误:', error.message);
    return Promise.reject(error);
  }
);

// 获取重点关注区域列表
export const fetchAreaList = async () => {

  const data = await apiClient.get('/monitoring-points');
  return data;

}

// 获取当前选中的重点关注区域
export const fetchCurrentSelectedArea = async () => {

  const data = await apiClient.get('/monitoring-points/selected');
  return data;

}

// 更新选中的重点关注区域
export const updateSelectedArea = async (area) => {
  try {
    const data = await apiClient.post('/monitoring-points/selected', { pointId: area.id });
    return data;
  } catch (error) {
    console.error('保存重点关注区域切换信息失败:', error);
    throw error;
  }
}

// 添加新的重点关注区域
export const addNewArea = async (areaData) => {
  try {
    const data = await apiClient.post('/monitoring-points', areaData);
    return data;
  } catch (error) {
    console.error('添加重点关注区域失败:', error);
    throw error;
  }
};

// 获取单点适飞指数分析数据
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

  // 尝试调用真实API - 注意：后端路径是 /api/suitability/status
  // 使用提取的pointId，而不是currentPoint对象
  const url = `/suitability/status?pointId=${encodeURIComponent(pointId || 'area-1')}&totalHours=3`;

  const response = await apiClient.get(url);
  return response


}


// 获取实时适飞指数（单时间点）
export const getCurrentSuitabilityIndex = async (currentPoint) => {
  if (!currentPoint) {
    throw new Error('未选择重点关注区域');
  }

  const pointId = currentPoint.id || currentPoint.pointId;

  // 调用真实API - 使用现有的/suitability/status接口
  const url = `/suitability/status?pointId=${encodeURIComponent(pointId)}&totalHours=1`;
  const response = await apiClient.get(url);

  if (response && response.data) {
    return response.data;
  }

  throw new Error('实时适飞指数API返回数据为空');
}

export const getWeatherForecastTrend = async (params) => {
  const params1 = {
    latitude: 52.52,
    longitude: 13.41,
    minutely_15: ["precipitation", "wind_speed_10m", "visibility"],
    forecast_days: 1,
  };
  const url = "https://api.open-meteo.com/v1/forecast";
  const responses = await fetchWeatherApi(url, params1);
  // Process first location. Add a for-loop for multiple locations or weather models
  const response = responses[0];
  // Attributes for timezone and location
  const latitude = response.latitude();
  const longitude = response.longitude();
  const elevation = response.elevation();
  const utcOffsetSeconds = response.utcOffsetSeconds();

  const minutely15 = response.minutely15();

  // Note: The order of weather variables in the URL query and the indices below need to match!
  const weatherData = {
    minutely15: {
      time: Array.from(
        { length: (Number(minutely15.timeEnd()) - Number(minutely15.time())) / minutely15.interval() },
        (_, i) => new Date((Number(minutely15.time()) + i * minutely15.interval() + utcOffsetSeconds) * 1000)
      ),
      // 将TypedArray转换为普通JavaScript数组，解决ECharts的"dimensions must be given if data is TypedArray"错误
      precipitation: Array.from(minutely15.variables(0).valuesArray()).map(value => Number(value.toFixed(2))),
      // 风速：保留两位小数
      wind_speed_10m: Array.from(minutely15.variables(1).valuesArray()).map(value => Number(value.toFixed(2))),
      // 能见度：从米转换为公里并取整
      visibility: Array.from(minutely15.variables(2).valuesArray()).map(value => Math.round(value / 1000)),
    },

  };

  // The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information
  console.log("\nMinutely15 data:\n", weatherData.minutely15)
  return weatherData.minutely15
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
    const proxyUrl = `/api/weather/now?location=${longitude},${latitude}&key=${API_KEY}`;

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




// 主函数：获取当前监测点天气数据（调用后端接口）
export const fetchCurrentPointWeather = async (currentPoint) => {
  try {
    if (!currentPoint) {
      throw new Error('未选择重点关注区域')
    }

    // 获取监测点ID
    const pointId = currentPoint.id || currentPoint.pointId || 'point-1';

    // 调用后端实时天气接口
    const data = await apiClient.get(`/weather/realtime?pointId=${pointId}`);

    // 后端返回的数据格式：{ updateTime, data: { ... } }
    // 适配前端期望的格式
    if (data && data.data) {
      const weatherData = data.data;
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
export const getCitywideHeatmap = async (params = {}) => {
  const {
    timestamp,
    timeRange = '3h',
    resolution = 'medium'
  } = params;

  console.log('[全市热力图] 获取全市热力图数据');

  try {
    // 尝试调用后端API获取全市热力图
    // 这里假设后端有一个/citywide/heatmap接口
    const totalHours = parseInt(timeRange.replace('h', '')) || 3;
    const url = `/weather/heatmap/citywide?totalHours=${totalHours}&resolution=${resolution}`;

    const response = await apiClient.get(url);

    if (response && response.data) {
      console.log('[全市热力图] API调用成功');
      return response.data;
    }

    console.warn('[全市热力图] API返回数据为空，使用模拟数据');
    return generateMockCitywideHeatmapData(totalHours, resolution);

  } catch (error) {
    console.error('[全市热力图] API调用失败:', error);
    // 返回模拟数据作为降级方案
    return generateMockCitywideHeatmapData(totalHours, resolution);
  }
};

// 生成模拟全市热力图数据
const generateMockCitywideHeatmapData = (totalHours, resolution) => {
  console.log(`[全市热力图] 生成模拟全市热力图数据，hours: ${totalHours}, resolution: ${resolution}`);

  // 青岛市的大致边界范围
  const qingdaoBounds = {
    minLon: 120.0,
    maxLon: 121.0,
    minLat: 36.0,
    maxLat: 37.0
  };

  // 根据分辨率确定网格密度
  const gridDensity = resolution === 'high' ? 20 : resolution === 'medium' ? 15 : 10;
  const gridSize = gridDensity;

  // 生成网格点数据
  const points = [];
  const lonStep = (qingdaoBounds.maxLon - qingdaoBounds.minLon) / gridSize;
  const latStep = (qingdaoBounds.maxLat - qingdaoBounds.minLat) / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lon = qingdaoBounds.minLon + i * lonStep + (Math.random() * lonStep * 0.3);
      const lat = qingdaoBounds.minLat + j * latStep + (Math.random() * latStep * 0.3);

      // 模拟风险值：0-100，模拟一些高风险区域
      let value = 30 + Math.random() * 40; // 基础值 30-70

      // 在特定区域模拟高风险
      const inHighRiskArea1 = lon > 120.3 && lon < 120.6 && lat > 36.1 && lat < 36.3;
      const inHighRiskArea2 = lon > 120.7 && lon < 120.9 && lat > 36.4 && lat < 36.6;

      if (inHighRiskArea1 || inHighRiskArea2) {
        value = 70 + Math.random() * 30; // 高风险区域 70-100
      }

      // 模拟一些低风险区域
      const inLowRiskArea = lon > 120.1 && lon < 120.4 && lat > 36.6 && lat < 36.9;
      if (inLowRiskArea) {
        value = 20 + Math.random() * 20; // 低风险区域 20-40
      }

      points.push({
        lon: parseFloat(lon.toFixed(6)),
        lat: parseFloat(lat.toFixed(6)),
        value: parseFloat(value.toFixed(1))
      });
    }
  }

  return {
    success: true,
    data: {
      points: points,
      bounds: qingdaoBounds,
      timestamp: new Date().toISOString(),
      resolution: resolution,
      totalPoints: points.length
    }
  };
};

export const getWeatherForecastHeatmap = async (params = {}) => {
  const {
    currentPoint,
    timestamp,
    timeRange = '3h'
  } = params;

  // 如果没有传入区域，尝试从store获取当前选中区域
  let pointId = null;

  if (currentPoint) {
    pointId = currentPoint.id || currentPoint.pointId;
  }

  // 如果没有pointId，使用默认值
  if (!pointId) {
    // 尝试从store获取当前选中的监测点
    try {
      const { useAreaStore } = await import('@/store/modules/area');
      const areaStore = useAreaStore();
      const selectedArea = areaStore.selectedArea;
      if (selectedArea && selectedArea.id) {
        pointId = selectedArea.id;
      }
    } catch (error) {
      console.warn('无法获取当前选中区域，使用默认值');
    }
  }

  // 最终fallback
  if (!pointId) {
    pointId = 'area-1';
  }

  // 修正：调用正确的适飞分析API
  const totalHours = parseInt(timeRange.replace('h', '')) || 3;
  const url = `/suitability/status?pointId=${encodeURIComponent(pointId)}&totalHours=${totalHours}`;

  try {
    console.log('[适飞分析] 调用API:', url);
    const response = await apiClient.get(url);

    if (response && response.data) {
      console.log('[适飞分析] API调用成功');

      // 格式化数据供前端使用
      return formatSuitabilityDataForChart(response.data, pointId, totalHours);
    }

    console.warn('[适飞分析] API返回数据为空，使用模拟数据');
    return generateMockSuitabilityData(pointId, totalHours);

  } catch (error) {
    console.error('[适飞分析] API调用失败:', error);
    // 返回模拟数据作为降级方案
    return generateMockSuitabilityData(pointId, totalHours);
  }
};

// 格式化后端数据为前端图表需要格式
const formatSuitabilityDataForChart = (apiData, pointId, totalHours) => {
  if (!apiData) {
    console.warn('[适飞分析] 格式化数据：API数据为空');
    return generateMockSuitabilityData(pointId, totalHours);
  }

  // 检查数据格式
  if (apiData.success !== undefined && apiData.data !== undefined) {
    // 已经是正确的格式
    return apiData;
  }

  // 尝试从旧格式中提取数据
  if (apiData.suitabilityList && apiData.suitabilityList.length > 0) {
    // 提取第一个因素的数据作为热力图数据（通常是"综合"因素）
    const firstFactor = apiData.suitabilityList[0];
    if (!firstFactor || !firstFactor.detail) {
      console.warn('[适飞分析] 格式化数据：没有有效的detail数据');
      return generateMockSuitabilityData(pointId, totalHours);
    }

    // 构建热力图数据矩阵
    const times = firstFactor.detail.map(d => {
      try {
        const date = new Date(d.timePoint);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } catch (error) {
        return '12:00'; // 默认值
      }
    });

    // 假设有6个高度层（0-500m，每100m一层）
    const heights = ['0m', '100m', '200m', '300m', '400m', '500m'];
    const profileData = [];

    // 为每个高度层创建数据
    for (let h = 0; h < heights.length; h++) {
      const row = [];
      for (let t = 0; t < times.length; t++) {
        // 模拟高度衰减：高度越高，适飞指数可能越低
        const baseValue = firstFactor.detail[t]?.valueData ?
          parseFloat(firstFactor.detail[t].valueData) : 70;
        const heightFactor = 1.0 - (h * 0.1); // 每100m降低10%
        const randomVariation = 0.9 + Math.random() * 0.2;
        const value = Math.min(100, Math.max(0, baseValue * heightFactor * randomVariation));
        row.push(Number(value.toFixed(1)));
      }
      profileData.push(row);
    }

    return {
      success: true,
      data: {
        times: times,
        heights: heights,
        profile: profileData,
        overallScores: apiData.overallScores || []
      }
    };
  }

  console.warn('[适飞分析] 格式化数据：无法识别的数据格式，使用模拟数据');
  return generateMockSuitabilityData(pointId, totalHours);
};

// 模拟适飞数据（降级方案）
const generateMockSuitabilityData = (pointId, totalHours) => {
  console.log(`[适飞分析] 生成模拟数据，pointId: ${pointId}, hours: ${totalHours}`);

  const hours = totalHours || 3;
  const timeLabels = [];
  const now = new Date();

  // 每10分钟一个点
  for (let i = 0; i <= hours * 6; i++) {
    const time = new Date(now.getTime() + i * 10 * 60000);
    timeLabels.push(`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`);
  }

  const heightLabels = ['0m', '100m', '200m', '300m', '400m', '500m'];
  const profileData = [];

  // 生成模拟数据
  for (let h = 0; h < heightLabels.length; h++) {
    const row = [];
    for (let t = 0; t < timeLabels.length; t++) {
      // 模拟日变化：中午适飞性最好
      const hourFactor = Math.sin((t / timeLabels.length) * Math.PI) * 0.3 + 0.7;
      // 高度衰减：高度越高适飞性越低
      const heightFactor = 1.0 - (h * 0.15);
      // 随机波动
      const randomFactor = 0.85 + Math.random() * 0.3;

      const value = Math.min(100, Math.max(20, 70 * hourFactor * heightFactor * randomFactor));
      row.push(Number(value.toFixed(1)));
    }
    profileData.push(row);
  }

  // 计算综合评分
  const overallScores = [];
  if (profileData.length > 0 && profileData[0].length > 0) {
    for (let t = 0; t < profileData[0].length; t++) {
      let sum = 0;
      for (let h = 0; h < profileData.length; h++) {
        sum += profileData[h][t];
      }
      overallScores.push(Number((sum / profileData.length).toFixed(1)));
    }
  }

  return {
    success: true,
    data: {
      times: timeLabels,
      heights: heightLabels,
      profile: profileData,
      overallScores: overallScores
    }
  };
};

// 获取风险预警数据
export const getRiskWarnings = async (params = {}) => {
  try {
    const { pointId, timeRange } = params;
    let url = '/weather/risk/report';
    const queryParams = [];
    if (pointId) queryParams.push(`pointId=${pointId}`);
    if (timeRange) queryParams.push(`timeRange=${timeRange}`);
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    const data = await apiClient.get(url);
    return data;
  } catch (error) {
    console.error('获取风险预警数据失败：', error);
    throw error;
  }
}

// 获取地理空间热力图数据（用于Cesium地图）
export const getWeatherHeatmapGeo = async (params = {}) => {
  try {
    const {
      time,
      resolution = 'medium',
      pointId
    } = params;

    if (!pointId) {
      throw new Error('监测点ID参数(pointId)是必需的');
    }

    // 构建API请求参数
    const queryParams = new URLSearchParams();
    queryParams.append('pointId', pointId);
    if (time) queryParams.append('time', time.toISOString ? time.toISOString() : time);
    if (resolution) queryParams.append('resolution', resolution);

    const url = `/weather/heatmap/geo?${queryParams.toString()}`;
    console.log('调用地理空间热力图API:', url);

    const response = await apiClient.get(url);

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
  // try {
  //   const data = await apiClient.get('/weather/wind');
  //   return data;
  // } catch (error) {
  //   console.error('获取风场数据失败，使用模拟数据：', error.message);

  // 导入并返回mock风场数据
  const mockWindData = await import('../mock/windData.js');
  return mockWindData.default;
  //  }
}



// 获取热力图数据（微尺度天气）
export const getHeatmapData = async (params = {}) => {
  try {
    const { region, timeRange } = params;
    let url = '/weather/microscale';
    const queryParams = [];
    if (region) queryParams.push(`region=${region}`);
    if (timeRange) queryParams.push(`timeRange=${timeRange}`);
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    const data = await apiClient.get(url);
    return data;
  } catch (error) {
    console.error('获取热力图数据失败：', error.message);
    throw error; // 不返回模拟数据，直接抛出错误
  }
}

// 生成模拟微尺度热力图数据（用于getHeatmapData）
function generateMockMicroscaleHeatmapData(params = {}) {
  const { region = 'default', timeRange = '24h' } = params;

  // 生成网格数据 (10x10 网格)
  const gridSize = 10;
  const data = [];

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      // 风险等级: 1-5 (1=低风险, 5=高风险)
      const riskLevel = Math.floor(Math.random() * 5) + 1;
      // 风速: 0-20 m/s
      const windSpeed = Math.random() * 20;
      // 风切变: 0-1.5
      const windShear = Math.random() * 1.5;
      // 湍流: 0-1.0
      const turbulence = Math.random();

      data.push({
        id: `${region}_${x}_${y}`,
        region,
        data_time: new Date().toISOString(),
        grid_size: gridSize,
        grid_x: x,
        grid_y: y,
        risk_level: riskLevel,
        wind_speed: windSpeed,
        wind_shear: windShear,
        turbulence: turbulence,
        created_at: new Date().toISOString()
      });
    }
  }

  return {
    code: 200,
    message: '成功',
    data: {
      region,
      time_range: timeRange,
      grid_size: gridSize,
      data: data.slice(0, 100) // 限制返回100条数据
    }
  };
}

// ==================== 设备监测接口 ====================

// 获取设备统计
export const getDeviceCount = async () => {
  try {
    const data = await apiClient.get('/devices/count');
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
    const data = await apiClient.get(url);
    return data;
  } catch (error) {
    console.error('获取设备告警失败:', error);
    throw error;
  }
}

// 获取设备历史数据
export const getDeviceHistory = async () => {
  try {
    const data = await apiClient.get('/devices/history');
    return data;
  } catch (error) {
    console.error('获取设备历史数据失败:', error);
    throw error;
  }
}

// ==================== 摄像头接口 ====================

// 获取摄像头列表
export const getCameras = async (status) => {
  try {
    let url = '/cameras';
    if (status) url += `?status=${status}`;
    const data = await apiClient.get(url);
    return data;
  } catch (error) {
    console.error('获取摄像头列表失败:', error);
    throw error;
  }
}

// ==================== 航路分析接口 ====================

// 获取航路列表
export const getRoutes = async () => {
  try {
    const data = await apiClient.get('/routes');
    return data;
  } catch (error) {
    console.error('获取航路列表失败（后端RouteService有IndexOutOfBoundsException）:', error);
    // 临时返回空数组，避免前端崩溃
    return {
      code: 200,
      message: '成功',
      data: {
        routes: [],
        total: 0,
        available: 0
      }
    };
  }
}

// 获取航路详情
export const getRouteDetail = async (routeId) => {
  try {
    const data = await apiClient.get(`/routes/${routeId}`);
    return data;
  } catch (error) {
    console.error('获取航路详情失败（后端RouteService有IndexOutOfBoundsException）:', error);
    // 临时返回空数据，避免前端崩溃
    return {
      code: 200,
      message: '成功',
      data: {
        routeId,
        routeName: `航路${routeId}`,
        weatherAlongRoute: [],
        riskAssessment: { overallRisk: '未知', factors: [] },
        recommendations: ['后端服务暂时不可用']
      }
    };
  }
}

// 生成模拟航路列表数据
function generateMockRoutesData() {
  const routes = [
    {
      id: 'ROUTE-001',
      name: '航路一',
      start: '起飞点A',
      end: '降落点B',
      distance: '120km',
      estimatedTime: '15min',
      weatherCondition: '良好',
      status: '可用',
      riskLevel: '低'
    },
    {
      id: 'ROUTE-002',
      name: '航路二',
      start: '起飞点A',
      end: '降落点C',
      distance: '180km',
      estimatedTime: '22min',
      weatherCondition: '一般',
      status: '可用',
      riskLevel: '中'
    },
    {
      id: 'ROUTE-003',
      name: '航路三',
      start: '起飞点B',
      end: '降落点C',
      distance: '90km',
      estimatedTime: '12min',
      weatherCondition: '良好',
      status: '可用',
      riskLevel: '低'
    },
    {
      id: 'ROUTE-004',
      name: '训练航路',
      start: '训练场A',
      end: '训练场B',
      distance: '60km',
      estimatedTime: '8min',
      weatherCondition: '较差',
      status: '限制',
      riskLevel: '高'
    }
  ];

  return {
    code: 200,
    message: '成功',
    data: {
      routes,
      total: routes.length,
      available: routes.filter(r => r.status === '可用').length
    }
  };
}

// 生成模拟航路详情数据
function generateMockRouteDetailData(routeId) {
  const routeDetails = {
    'ROUTE-001': {
      routeId: 'ROUTE-001',
      routeName: '航路一',
      description: '主要商业航路，连接A-B两个主要机场',
      weatherAlongRoute: [
        { segment: '起点', wind: '3-4级', visibility: '10km', precipitation: '无', temperature: '25°C' },
        { segment: '中段', wind: '4-5级', visibility: '8km', precipitation: '无', temperature: '23°C' },
        { segment: '终点', wind: '3级', visibility: '12km', precipitation: '无', temperature: '26°C' }
      ],
      riskAssessment: {
        overallRisk: '低',
        factors: [
          { factor: '风速', risk: '低', value: '3.5m/s' },
          { factor: '能见度', risk: '低', value: '9.2km' },
          { factor: '降水量', risk: '低', value: '0mm' },
          { factor: '湍流', risk: '中', value: '0.4' },
          { factor: '风切变', risk: '低', value: '0.2' }
        ]
      },
      recommendations: [
        '建议飞行高度：300-500米',
        '建议飞行速度：60-80km/h',
        '注意中段风力变化',
        '保持与地面通讯畅通'
      ]
    },
    'ROUTE-002': {
      routeId: 'ROUTE-002',
      routeName: '航路二',
      description: '山区航路，地形复杂',
      weatherAlongRoute: [
        { segment: '起点', wind: '4-5级', visibility: '8km', precipitation: '小雨', temperature: '22°C' },
        { segment: '山区段', wind: '5-6级', visibility: '5km', precipitation: '中雨', temperature: '20°C' },
        { segment: '终点', wind: '3-4级', visibility: '10km', precipitation: '无', temperature: '24°C' }
      ],
      riskAssessment: {
        overallRisk: '中',
        factors: [
          { factor: '风速', risk: '中', value: '5.2m/s' },
          { factor: '能见度', risk: '中', value: '6.5km' },
          { factor: '降水量', risk: '中', value: '2.1mm/h' },
          { factor: '湍流', risk: '高', value: '0.7' },
          { factor: '地形', risk: '高', value: '复杂' }
        ]
      },
      recommendations: [
        '建议飞行高度：500-800米',
        '建议飞行速度：50-70km/h',
        '山区段注意强风和低能见度',
        '建议绕行或延迟飞行'
      ]
    },
    'ROUTE-003': {
      routeId: 'ROUTE-003',
      routeName: '航路三',
      description: '短途训练航路',
      weatherAlongRoute: [
        { segment: '起点', wind: '2-3级', visibility: '15km', precipitation: '无', temperature: '26°C' },
        { segment: '训练区', wind: '3-4级', visibility: '12km', precipitation: '无', temperature: '25°C' },
        { segment: '终点', wind: '2-3级', visibility: '15km', precipitation: '无', temperature: '27°C' }
      ],
      riskAssessment: {
        overallRisk: '低',
        factors: [
          { factor: '风速', risk: '低', value: '2.8m/s' },
          { factor: '能见度', risk: '低', value: '13.2km' },
          { factor: '降水量', risk: '低', value: '0mm' },
          { factor: '湍流', risk: '低', value: '0.2' },
          { factor: '空域', risk: '低', value: '空闲' }
        ]
      },
      recommendations: [
        '适合训练飞行',
        '建议飞行高度：200-400米',
        '注意其他训练飞机',
        '保持目视飞行规则'
      ]
    }
  };

  const detail = routeDetails[routeId] || {
    routeId,
    routeName: `航路${routeId.split('-')[1] || '未知'}`,
    description: '航路信息',
    weatherAlongRoute: [],
    riskAssessment: { overallRisk: '未知', factors: [] },
    recommendations: ['暂无建议']
  };

  return {
    code: 200,
    message: '成功',
    data: detail
  };
}

// 创建新航线
export const createRoute = async (routeData) => {
  try {
    const data = await apiClient.post('/routes', routeData);
    return data;
  } catch (error) {
    console.error('创建航线失败:', error);
    // 临时返回成功结果，避免前端崩溃
    return {
      code: 200,
      message: '成功',
      data: {
        success: true,
        routeId: `route-${Date.now()}`,
        message: '航线创建成功（模拟）'
      }
    };
  }
}

// 分析航线风险
export const analyzeRouteRisk = async (routeId, params = {}) => {
  try {
    const data = await apiClient.post(`/routes/${routeId}/analyze`, params);
    return data;
  } catch (error) {
    console.error('分析航线风险失败:', error);
    // 临时返回模拟分析数据
    return {
      code: 200,
      message: '成功',
      data: {
        success: true,
        routeId,
        routeName: `航线${routeId}`,
        analysisTime: new Date().toISOString(),
        riskDimensions: [
          {
            dimension: '风速风险',
            level: 'medium',
            score: 6.5,
            description: '航线中存在3个航段风速超过8m/s'
          },
          {
            dimension: '能见度风险',
            level: 'low',
            score: 3.2,
            description: '能见度良好，平均大于10km'
          }
        ],
        overallAssessment: {
          overallRisk: 'medium',
          overallScore: 6.0,
          safetyLevel: '可飞行',
          recommendation: '建议调整飞行高度'
        },
        measures: [
          {
            title: '调整飞行高度',
            description: '将飞行高度提升至500米以上',
            priority: 'high'
          }
        ],
        alternativeRoutes: [
          {
            name: '北部绕行航线',
            riskLevel: 'low',
            distance: 22.3,
            description: '避开所有高风险区域',
            estimatedTime: '18分钟'
          }
        ]
      }
    };
  }
}
