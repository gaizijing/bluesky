import request from '../utils/request';
import { fetchWeatherApi } from "openmeteo";



// 获取重点关注区域列表
export const fetchAreaList = async () => {

  const data = await request.get('/monitoring-points');
  return data;

}

// 获取当前选中的重点关注区域
export const fetchCurrentSelectedArea = async () => {

  const data = await request.get('/monitoring-points/selected');
  return data;

}

// 更新选中的重点关注区域
export const updateSelectedArea = async (area) => {
  try {
    const data = await request.post('/monitoring-points/selected', { pointId: area.id });
    return data;
  } catch (error) {
    console.error('保存重点关注区域切换信息失败:', error);
    throw error;
  }
}

// 添加新的重点关注区域
export const addNewArea = async (areaData) => {
  try {
    const data = await request.post('/monitoring-points', areaData);
    return data;
  } catch (error) {
    console.error('添加重点关注区域失败:', error);
    throw error;
  }
};

// 更新指定的监测点
export const updateMonitoringPoint = async (id, areaData) => {
  try {
    const data = await request.put(`/monitoring-points/${id}`, areaData);
    return data;
  } catch (error) {
    console.error('更新监测点失败:', error);
    throw error;
  }
};

// 删除指定的监测点
export const deleteMonitoringPoint = async (id) => {
  try {
    const data = await request.delete(`/monitoring-points/${id}`);
    return data;
  } catch (error) {
    console.error('删除监测点失败:', error);
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




// 主函数：获取当前监测点天气数据（调用后端接口）
export const fetchCurrentPointWeather = async (pointId) => {
  try {

    // 调用后端实时天气接口
    const data = await request.get(`/weather/realtime?pointId=${pointId}`);
    // 适配前端期望的格式
    if (data && data.data) {
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
    if (timeRange) queryParams.push(`timeRange=${timeRange}`);
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
    if (time) queryParams.append('time', time.toISOString ? time.toISOString() : time);

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
  const data = await request.get('/wind-field?bounds=119,35,122,37');
  return data;
}

// ==================== 地区配置管理接口 ====================

// 获取地区配置信息（兼容旧接口）
export const getRegionConfig = async () => {
  try {
    const response = await request.get('/weather/region-config');
    if (response) {
      return response;
    }
    throw new Error('API返回数据为空');
  } catch (error) {
    console.error('获取地区配置信息失败:', error);
    throw error;
  }
};

// 获取所有地区配置
export const getAllRegionConfigs = async () => {
  try {
    const response = await request.get('/region-config/list');
    return response;
  } catch (error) {
    console.error('获取地区配置列表失败:', error);
    throw error;
  }
};

// 获取默认地区配置
export const getDefaultRegionConfig = async () => {
  try {
    const response = await request.get('/region-config/default');
    return response;
  } catch (error) {
    console.error('获取默认地区配置失败:', error);
    throw error;
  }
};

// 根据ID获取地区配置
export const getRegionConfigById = async (id) => {
  try {
    const response = await request.get(`/region-config/${id}`);
    return response;
  } catch (error) {
    console.error('获取地区配置详情失败:', error);
    throw error;
  }
};

// 添加地区配置
export const addRegionConfig = async (data) => {
  try {
    const response = await request.post('/region-config', data);
    return response;
  } catch (error) {
    console.error('添加地区配置失败:', error);
    throw error;
  }
};

// 更新地区配置
export const updateRegionConfig = async (data) => {
  try {
    const response = await request.put('/region-config', data);
    return response;
  } catch (error) {
    console.error('更新地区配置失败:', error);
    throw error;
  }
};

// 删除地区配置
export const deleteRegionConfig = async (id) => {
  try {
    const response = await request.delete(`/region-config/${id}`);
    return response;
  } catch (error) {
    console.error('删除地区配置失败:', error);
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
export const getCameras = async (status) => {
  try {
    let url = '/cameras';
    if (status) url += `?status=${status}`;
    const data = await request.get(url);
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
    const data = await request.get('/routes');
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
    const data = await request.get(`/routes/${routeId}`);
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
    const data = await request.post('/routes', routeData);
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
    const data = await request.post(`/routes/${routeId}/analyze`, params);
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
};

// 清空所有航线
export const clearRoutes = async () => {
  try {
    const data = await request.delete('/routes/clear-history');
    return data;
  } catch (error) {
    console.error('清空航线失败:', error);
    // 临时返回成功结果
    return {
      code: 200,
      message: '成功',
      data: {
        success: true,
        message: '航线清空成功（模拟）'
      }
    };
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
