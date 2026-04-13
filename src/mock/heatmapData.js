// 模拟热力图数据
// 根据不同时间戳返回不同的热力图数据
import { useRegionStore } from '@/store/modules/region';

export const generateHeatmapData = (timestamp) => {
  // 根据时间戳生成不同的随机数据
  const date = new Date(timestamp);
  const hour = date.getHours();
  
  // 基于小时生成更明显的中心点偏移
  const latOffset = Math.sin(hour / 24 * Math.PI * 2) * 0.02; // 正弦函数生成0.04度的变化范围
  const lngOffset = Math.cos(hour / 24 * Math.PI * 2) * 0.02; // 余弦函数生成0.04度的变化范围
  
  // 从region store获取地区中心坐标
  const regionStore = useRegionStore();
  const [baseLng, baseLat] = regionStore.getRegionCenter;
  
  // 应用时间偏移
  const finalLng = baseLng + lngOffset;
  const finalLat = baseLat + latOffset;
  
  // 生成数据点
  const data = [];
  const pointCount = 800 + Math.floor(Math.random() * 400); // 更多数据点
  
  // 根据小时选择不同的分布模式
  const distributionMode = hour % 3; // 3种不同分布模式
  
  for (let i = 0; i < pointCount; i++) {
    let lat, lng;
    
    // 不同分布模式生成不同的坐标
    switch (distributionMode) {
      case 0: // 中心聚集模式
        lat = finalLat + (Math.random() - 0.5) * 0.04 * Math.random();
        lng = finalLng + (Math.random() - 0.5) * 0.04 * Math.random();
        break;
      case 1: // 均匀分布模式
        lat = finalLat + (Math.random() - 0.5) * 0.05;
        lng = finalLng + (Math.random() - 0.5) * 0.05;
        break;
      case 2: // 双中心分布模式
        if (Math.random() < 0.5) {
          // 主要中心
          lat = finalLat + (Math.random() - 0.5) * 0.03;
          lng = finalLng + (Math.random() - 0.5) * 0.03;
        } else {
          // 次要中心
          lat = finalLat + (Math.random() - 0.5) * 0.01 + 0.02;
          lng = finalLng + (Math.random() - 0.5) * 0.01 - 0.02;
        }
        break;
      default:
        lat = finalLat + (Math.random() - 0.5) * 0.04;
        lng = finalLng + (Math.random() - 0.5) * 0.04;
    }
    
    // 生成随时间变化更大的随机值（模拟温度）
    const baseValue = 15 + Math.sin(hour / 24 * Math.PI * 4) * 15; // 正弦函数生成0-30的基础变化
    const randomVariation = Math.random() * 25;
    const value = baseValue + randomVariation;
    
    data.push({
      lnglat: [lng, lat],
      value: value
    });
  }
  
  return data;
};

// 导出模拟的热力图数据生成函数
export default generateHeatmapData;