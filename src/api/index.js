import request from '../utils/request';
import axios from 'axios';
import cacheUtils, { cacheAsync } from '../utils/cacheUtils';
import { fetchWeatherApi } from "openmeteo";

// 获取重点关注区域列表
export const fetchAreaList = async () => {
  try {

    // 在实际项目中，这里会是真实的API调用:
    // const response = await axios.get('/api/monitoring-points')

    const response = {
      "code": 200,
      "message": "success",
      "data":
        [
          {
            "id": "point-1",
            "name": "青岛中心起降坪",
            "type": "takeoff",
            "location": "市南区-五四广场附近",
            "coordinates": [120.3835, 36.0625],
            "bbox": [[120.3735, 36.0525], [120.3935, 36.0725]],
            "status": "available",
            "warningReason": "",
            "lastUpdate": 1640995200000
          },
          {
            "id": "point-2",
            "name": "崂山区起降点",
            "type": "takeoff",
            "location": "崂山区-石老人附近",
            "coordinates": [120.4750, 36.1120],
            "bbox": [[120.4650, 36.1020], [120.4850, 36.1220]],
            "status": "available",
            "warningReason": "",
            "lastUpdate": 1640996400000
          },
          {
            "id": "point-3",
            "name": "西海岸作业点",
            "type": "operation",
            "location": "西海岸新区-金沙滩附近",
            "coordinates": [120.1680, 35.9950],
            "bbox": [[120.1580, 35.9850], [120.1780, 36.0050]],
            "status": "warning",
            "warningReason": "信号强度不稳定",
            "lastUpdate": 1640997300000
          },
          {
            "id": "point-4",
            "name": "即墨区起降坪",
            "type": "takeoff",
            "location": "即墨区-蓝谷附近",
            "coordinates": [120.4820, 36.3780],
            "bbox": [[120.4720, 36.3680], [120.4920, 36.3880]],
            "status": "available",
            "warningReason": "",
            "lastUpdate": 1640988000000
          },
          {
            "id": "point-5",
            "name": "城阳区作业点",
            "type": "operation",
            "location": "城阳区-流亭附近",
            "coordinates": [120.3560, 36.3050],
            "bbox": [[120.3460, 36.2950], [120.3660, 36.3150]],
            "status": "unavailable",
            "warningReason": "设备维护中",
            "lastUpdate": 1640916000000
          },
          {
            "id": "point-6",
            "name": "青岛流亭机场起降点",
            "type": "takeoff",
            "location": "城阳区-流亭国际机场",
            "coordinates": [120.3850, 36.3180],
            "bbox": [[120.3750, 36.3080], [120.3950, 36.3280]],
            "status": "warning",
            "warningReason": "温度异常",
            "lastUpdate": 1640998200000
          },
          {
            "id": "point-7",
            "name": "高新区作业点",
            "type": "operation",
            "location": "高新区-红岛附近",
            "coordinates": [120.3150, 36.2320],
            "bbox": [[120.3050, 36.2220], [120.3250, 36.2420]],
            "status": "available",
            "warningReason": "",
            "lastUpdate": 1640996800000
          },
          {
            "id": "point-8",
            "name": "李沧区起降点",
            "type": "takeoff",
            "location": "李沧区-世园会附近",
            "coordinates": [120.4480, 36.1850],
            "bbox": [[120.4380, 36.1750], [120.4580, 36.1950]],
            "status": "available",
            "warningReason": "",
            "lastUpdate": 1640998500000
          },
          {
            "id": "point-9",
            "name": "胶州市作业点",
            "type": "operation",
            "location": "胶州市-胶州湾附近",
            "coordinates": [120.0560, 36.2950],
            "bbox": [[120.0460, 36.2850], [120.0660, 36.3050]],
            "status": "available",
            "warningReason": "",
            "lastUpdate": 1640994300000
          },
          {
            "id": "point-10",
            "name": "青岛港起降坪",
            "type": "takeoff",
            "location": "市南区-青岛港附近",
            "coordinates": [120.3920, 36.0880],
            "bbox": [[120.3820, 36.0780], [120.4020, 36.0980]],
            "status": "unavailable",
            "warningReason": "强风天气",
            "lastUpdate": 1640998440000
          }
        ]

    }

    return response.data
  } catch (error) {
    console.error('获取重点关注区域数据失败:', error)
    throw error
  }
}

// 获取当前选中的重点关注区域
export const fetchCurrentSelectedArea = async () => {
  try {
    // 在实际项目中，这里会是真实的API调用:
    // const response = await axios.get('/api/monitoring-points/selected')
    // return response.data

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 模拟成功响应
    const response = {
      "code": 200,
      "message": "success",
      "data": {
        "id": "point-1",
        "name": "青岛中心起降坪",
        "type": "takeoff",
        "location": "市南区-五四广场附近",
        "coordinates": [120.3835, 36.0625],
        "bbox": [[120.3735, 36.0525], [120.3935, 36.0725]],
        "status": "available",
        "warningReason": "",
        "lastUpdate": 1640995200000
      }
    }

    return response.data
  } catch (error) {
    console.error('获取当前选中重点关注区域失败:', error)
    throw error
  }
}
// 更新选中的重点关注区域
export const updateSelectedArea = async (area) => {
  try {
    // 在实际项目中，这里会是真实的API调用:
    // const response = await axios.post('/api/monitoring-points/selected', { pointId: point.id })
    // return response.data

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 模拟成功响应
    const response = {
      "code": 200,
      "message": "success",
      "data": {
        "pointId": area.id,
        "selectedTime": new Date().toISOString(),
        "status": "updated"
      }
    }

    return response.data
  } catch (error) {
    console.error('保存重点关注区域切换信息失败:', error)
    throw error
  }
}

// 适飞分析
export const getWeatherSuitability = async (currentPoint) => {
  if (!currentPoint) {
    throw new Error('未选择重点关注区域')
  }

  // 在实际项目中，这里会是真实的API调用:
  // const response = await axios.get(`/api/weather/point/${currentPoint.id}`)

  // 原始数据
  const factors = ["综合", "风", "风切变", "颠簸指数", "湍流", "降水", "能见度"];
  const timePoints = [
    "2025-11-17 10:00",
    "2025-11-17 10:10",
    "2025-11-17 10:20",
    "2025-11-17 10:30",
    "2025-11-17 10:40",
    "2025-11-17 10:50",
    "2025-11-17 11:00",
    "2025-11-17 11:10",
    "2025-11-17 11:20",
    "2025-11-17 11:30",
    "2025-11-17 11:40",
    "2025-11-17 11:50",
    "2025-11-17 12:00",
    "2025-11-17 12:10",
    "2025-11-17 12:20",
    "2025-11-17 12:30",
    "2025-11-17 12:40",
    "2025-11-17 12:50",
    "2025-11-17 13:00"
  ];
  const statusData = [
    // 综合
    [true, true, false, false, false, true, true, true, false, false, true, true, false, true, true, false, false, true, true],
    // 风
    [true, true, false, false, true, true, true, false, false, true, true, true, true, false, false, true, true, true, false],
    // 风切变
    [true, false, false, true, true, true, false, false, true, true, true, true, false, false, true, true, true, false, true],
    // 颠簸指数
    [true, true, true, false, false, true, true, true, true, false, false, true, true, true, false, false, true, true, false],
    // 湍流（全适飞）
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    // 降水（全适飞）
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    // 能见度（全适飞）
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
  ];
  const valueData = [
    // 综合（无具体值）
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    // 风（异常值）
    ["", "", "9m/s", "9m/s", "", "", "", "8m/s", "8m/s", "", "", "", "9m/s", "", "", "8m/s", "8m/s", "", "9m/s"],
    // 风切变（异常值）
    ["", "7m/s", "7m/s", "", "", "", "6m/s", "6m/s", "", "", "", "7m/s", "7m/s", "6m/s", "", "", "", "6m/s", "7m/s"],
    // 颠簸指数（异常值）
    ["", "", "", "中", "中", "", "", "", "", "中", "中", "", "", "", "中", "中", "", "", "中"],
    // 湍流（无异常值）
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    // 降水（无异常值）
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    // 能见度（无异常值）
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
  ];

  // 转换为新的数据结构
  const suitabilityList = factors.map((factor, factorIndex) => {
    const detail = timePoints.map((timePoint, timeIndex) => {
      // 对于不同因素，使用不同格式的时间点
      let formattedTimePoint = factorIndex === 0 ? timePoint.split(' ')[1] : timePoint;

      return {
        timePoint: formattedTimePoint,
        statusData: statusData[factorIndex][timeIndex],
        valueData: valueData[factorIndex][timeIndex]
      };
    });

    return {
      factor: factor,
      detail: detail
    };
  });

  const response = {
    "code": 200,
    "message": "success",
    "data": {
      "timeInterval": 10,
      "totalHours": 3,
      "suitabilityList": suitabilityList
    }
  };

  return response.data
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
  try {

    const [longitude, latitude] = currentPoint.coordinates;
    // 2. API核心配置（遵循官方规范）
    const API_KEY = import.meta.env.VITE_QWEATHER_API_KEY;
    // 拼接完整URL（HTTPS + 专属Host + 版本 + 接口）
    const requestUrl = `https://m73yfr9h37.re.qweatherapi.com/v7/weather/now`;

    // 3. 发起请求（符合官方认证和压缩规范）
    const response = await axios.get(requestUrl, {
      params: {
        location: `${longitude},${latitude}`, // 纬度,经度 格式
      },
      headers: {
        'X-QW-Api-Key': API_KEY, // 关键：请求头传Key（替代URL参数）
        'Accept': 'application/json'
      },
      timeout: 15000, // 15秒超时保护
      decompress: true // 自动解压Gzip（axios v1.0+ 支持）
    });

    // 4. 响应校验（遵循和风API错误码规范）
    const { data } = response;
    // 5. 格式化数据为项目可用格式
    const nowData = data.now;
    console.log(data);

    return nowData;

  } catch (error) {
    console.error('获取天气数据失败（遵循和风API规范）：', error.message);
    throw error; // 抛出错误供调用方处理
  }
};


// // 导出带缓存的函数，避免频繁调用和风天气API导致配额耗尽
// export const fetchBasicWeatherData = cacheAsync(fetchBasicWeatherDataFromAPI, {
//   prefix: 'weather_data', // 缓存键前缀
//   duration: 5 * 60 * 1000, // 缓存5分钟
//   useLocalStorage: true // 同时使用localStorage，保证页面刷新后仍能使用缓存
// });


// 原始的获取专业气象数据函数
const fetchProfessionalWeatherDataFromAPI = async (currentPoint) => {
  try {
    if (!currentPoint) {
      throw new Error('未选择重点关注区域')
    }

    // 在实际项目中，这里可能需要：
    // 1. 调用专业气象服务API
    // 2. 使用算法模型计算（如通过风速梯度计算风切变）
    // 3. 从特殊数据源获取

    // 模拟专业气象数据（实际项目中需要根据具体计算或专业API获取）

    // 模拟根据基本气象数据计算或从专业数据源获取的结果
    const response = {
      "code": 200,
      "message": "success",
      "data": {
        "windShearLevel": "medium", // 风切变等级
        "stabilityIndex": "C"       // 稳定度指数
      }
    }

    return response.data
  } catch (error) {
    console.error('获取专业气象数据失败:', error)
    throw error
  }
};

// 主函数：组合基本和专业气象数据，保持向后兼容
export const fetchCurrentPointWeather = async (currentPoint) => {
  try {
    if (!currentPoint) {
      throw new Error('未选择重点关注区域')
    }

    // 并行获取两类数据以提高性能
    const [basicData, professionalData] = await Promise.all([
      fetchBasicWeatherDataFromAPI(currentPoint),
      fetchProfessionalWeatherDataFromAPI(currentPoint)
    ]);
    // 合并两类数据
    const combinedData = {
      ...basicData,
      ...professionalData
    };
    console.log(combinedData);

    return combinedData;
  } catch (error) {
    console.error('获取当前重点关注区域天气数据失败:', error)
    throw error
  }
}
// 获取适飞分析数据
export const getWeatherForecastHeatmap = async (currentPoint) => {
  if (!currentPoint) {
    throw new Error('未选择重点关注区域')
  }

  // 在实际项目中，这里会是真实的API调用:
  // const response = await axios.get(`/api/weather/analysis/${currentPoint.id}`)

  const response = {
    "code": 200,
    "message": "success",
    "data": {

      "times": [
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00"
      ],
      "heights": [
        0,
        50,
        100,
        150,
        200,
        250,
        300
      ],
      "data": [
        [
          93,
          91,
         90,
          93,
          97,
          94,
          79

        ],
        [
          87,
          86,
          87,
          88,
          85,
          83,
          77
        ],
        [
          78,
          74,
          72,
          76,
          71,
          76,
          69
        ],
        [
          61,
          66,
          66,
          67,
          63,
          63,
          59
        ],
        [
          52,
          50,
          51,
          59,
          55,
          55,
          50
        ],
        [
          42,
          44,
          49,
          42,
          47,
          48,
          42
        ],
        [
          38,
          43,
          33,
          34,
          32,
          33,
          27
        ],
        [
          27,
          22,
          29,
          27,
          23,
          23,
          17
        ]
      ]

    }
  }
  return response.data
}

// 获取风险预警数据
export const getRiskWarnings = async () => {
  try {
    const response = await import('@/mock/riskWarnings.json')
    return response.default.data
  } catch (error) {
    console.error('获取风险预警数据失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}
const handleQuery = async () => {
  if (!validate()) return;
  setLoading(true);
  try {
    const params = new URLSearchParams({
      latitude: form.latitude,
      longitude: form.longitude,
      elevation: form.elevation,
      start_date: form.startDate,
      end_date: form.endDate,
      hourly: form.elements.join(','),
      timezone: 'Asia/Shanghai'
    });
    const response = await fetch(`https://api.open-meteo.com/v1/archive?${params}`, {
      method: 'GET'
    });
    if (!response.ok) {
      throw new Error(`HTTP错误：${response.status}`);
    }
    const rawData = await response.json();
    if (rawData.error) {
      throw new Error(rawData.reason || 'API请求失败');
    }
    const transformed = transformData(rawData);
    setResult(JSON.stringify({
      code: 200,
      message: '查询成功',
      data: transformed
    }, null, 2));
  } catch (error) {
    setResult(JSON.stringify({
      code: 400,
      message: error.message,
      data: null
    }, null, 2));
  } finally {
    setLoading(false);
  }
};
