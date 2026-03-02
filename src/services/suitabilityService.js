import { getWeatherSuitability, getCurrentSuitabilityIndex } from '@/api';
import { useAreaStore } from '@/store/modules/area';
import { useThresholdsStore } from '@/store/modules/thresholds';
import { useDashboardWeatherStore } from '@/store/modules/dashboardWeather';

// 适飞分析服务类
class SuitabilityService {
  constructor() {
    this.cache = new Map(); // 缓存适飞分析数据
    this.cacheTimeout = 2 * 60 * 1000; // 2分钟缓存（适飞数据变化较快）
  }

  // 获取区域store
  getAreaStore() {
    return useAreaStore();
  }

  // 获取阈值store
  getThresholdsStore() {
    return useThresholdsStore();
  }

  // 获取仪表盘天气store
  getDashboardWeatherStore() {
    return useDashboardWeatherStore();
  }

  // 获取当前选中的区域
  getCurrentArea() {
    const areaStore = this.getAreaStore();
    return areaStore.selectedArea;
  }

  // 获取阈值配置
  getThresholds() {
    const thresholdsStore = this.getThresholdsStore();
    return thresholdsStore.aircraftSuitabilityThresholds;
  }

  // 获取适飞分析数据
  async getSuitabilityData(params = {}) {
    try {
      const { timestamp = new Date(), forceRefresh = false } = params;
      const currentArea = this.getCurrentArea();

      if (!currentArea) {
        throw new Error('未选择重点关注区域');
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(currentArea, timestamp);

      // 检查缓存
      if (!forceRefresh && this.isCacheValid(cacheKey)) {
        console.log('[Suitability] 使用缓存数据');
        return this.cache.get(cacheKey).data;
      }

      // 获取阈值配置
      const thresholds = this.getThresholds();

      // 获取适飞分析数据
      const suitabilityData= await getWeatherSuitability({
        currentPoint: currentArea,
        timestamp,
        timeRange: '3h',
        includeThresholds: true
      });      

      if (!suitabilityData) {
        throw new Error('适飞分析数据为空');
      }

      // 集成阈值计算
      const enhancedData = this.enhanceWithThresholds(suitabilityData, thresholds);

      // 更新缓存
      this.updateCache(cacheKey, enhancedData);

      return enhancedData;

    } catch (error) {
      console.error('获取适飞分析数据失败:', error);
      throw error;
    }
  }

  // 生成缓存键
  generateCacheKey(area, timestamp) {
    const areaId = area?.id || 'no-area';
    const timeKey = timestamp ? timestamp.getTime() : 'no-time';
    return `suitability_${areaId}_${timeKey}`;
  }

  // 检查缓存是否有效
  isCacheValid(cacheKey) {
    const cachedItem = this.cache.get(cacheKey);
    if (!cachedItem) return false;

    const now = Date.now();
    return now - cachedItem.timestamp < this.cacheTimeout;
  }

  // 更新缓存
  updateCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    // 清理过期缓存
    this.cleanupCache();
  }

  // 清理过期缓存
  cleanupCache() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // 获取实时适飞指数
  async getCurrentSuitabilityIndex() {
    try {
      const currentArea = this.getCurrentArea();
      
      if (!currentArea) {
        throw new Error('未选择重点关注区域');
      }

      const response = await getCurrentSuitabilityIndex(currentArea);
      const indexData = response.data; // 从响应中提取数据
      const thresholds = this.getThresholds();

      // 集成阈值分析
      return this.enhanceCurrentIndexWithThresholds(indexData, thresholds);

    } catch (error) {
      console.error('获取实时适飞指数失败:', error);
      throw error;
    }
  }

  // 加载适飞分析面板数据
  async loadFlightSuitableAnalysisPanel(currentPoint) {
    try {
      const data = await this.getSuitabilityData({ timestamp: new Date() });

      const adaptedData = {
        timeInterval: data.timeInterval,
        totalHours: data.totalHours,
        factors: data.suitabilityList?.map(item => item.factor) || [],
        statusData: data.suitabilityList?.map(item =>
          item.detail?.map(detail => detail.statusData) || []
        ) || [],
        valueData: data.suitabilityList?.map(item =>
          item.detail?.map(detail => detail.valueData) || []
        ) || [],
        metadata: data.metadata,
        overallScores: data.overallScores
      };

      this.getDashboardWeatherStore().setFlightSuitableAnalysisPanelData(adaptedData);
    } catch (error) {
      console.error('加载适飞分析数据失败:', error);
    }
  }

  // 清除所有缓存
  clearCache() {
    this.cache.clear();
  }

  // 使用阈值增强适飞分析数据
  enhanceWithThresholds(suitabilityData, thresholds) {
    if (!suitabilityData || !thresholds) {
      return suitabilityData;
    }

    // 添加阈值信息
    suitabilityData.thresholds = thresholds;

    // 计算每个时间点的综合适飞指数
    if (suitabilityData.suitabilityList && suitabilityData.suitabilityList.length > 0) {
      const timeCount = suitabilityData.suitabilityList[0].detail.length;
      const overallScores = [];

      for (let timeIndex = 0; timeIndex < timeCount; timeIndex++) {
        // 收集当前时间点的各因素状态
        const factors = {};
        
        suitabilityData.suitabilityList.forEach((item, factorIndex) => {
          // 处理所有因素，包括第一个因素
          const detail = item.detail[timeIndex];
          factors[item.factor] = {
            status: detail.statusData,
            value: detail.valueData
          };
        });

        // 计算综合得分
        const score = this.calculateOverallScore(factors, thresholds);
        overallScores.push(score);
      }

      suitabilityData.overallScores = overallScores;
    }

    return suitabilityData;
  }

  // 使用阈值增强实时适飞指数
  enhanceCurrentIndexWithThresholds(indexData, thresholds) {
    if (!indexData || !thresholds) {
      return indexData;
    }

    // 添加阈值信息
    indexData.thresholds = thresholds;

    // 重新计算基于阈值的适飞状态
    if (indexData.factors) {
      Object.keys(indexData.factors).forEach(factorKey => {
        const factor = indexData.factors[factorKey];
        
        // 根据阈值重新判断是否适飞
        if (thresholds[factorKey] !== undefined) {
          factor.suitable = factor.value < thresholds[factorKey];
          factor.threshold = thresholds[factorKey];
        }
      });

      // 重新计算综合适飞指数
      let suitableCount = 0;
      let totalCount = 0;

      Object.values(indexData.factors).forEach(factor => {
        totalCount++;
        if (factor.suitable) suitableCount++;
      });

      indexData.overallSuitability = Math.round((suitableCount / totalCount) * 100);
      
      // 更新建议
      indexData.recommendation = this.getRecommendation(indexData.overallSuitability);
    }

    return indexData;
  }

  // 计算综合得分
  calculateOverallScore(factors, thresholds) {
    // 这里可以实现更复杂的评分算法
    // 目前使用简单加权平均
    
    let totalWeight = 0;
    let weightedScore = 0;

    // 定义因素权重
    const weights = {
      '风': 0.25,
      '风切变': 0.20,
      '能见度': 0.20,
      '降水': 0.15,
      '湍流': 0.10,
      '湿度': 0.05,
      '温度': 0.05
    };

    Object.keys(factors).forEach(factorName => {
      const factor = factors[factorName];
      const weight = weights[factorName] || 0.05;
      
      if (factor.status) {
        weightedScore += weight * 100; // 适飞得100分
      } else {
        weightedScore += weight * 40; // 不适飞得40分
      }
      
      totalWeight += weight;
    });

    // 归一化到0-100
    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
    return Math.max(0, Math.min(100, score));
  }

  // 根据得分获取建议
  getRecommendation(score) {
    if (score >= 80) return '适飞';
    if (score >= 60) return '较适';
    if (score >= 40) return '谨慎';
    return '不适';
  }
}

// 导出类
export { SuitabilityService };