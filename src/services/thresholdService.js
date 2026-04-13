import {
  getAllThresholds,
  getThresholdById,
  getThresholdByAircraftId,
  getDefaultThreshold,
  addThreshold,
  updateThreshold,
  deleteThreshold
} from '@/api'

// 阈值管理API服务
export const thresholdService = {
  // 获取所有阈值配置
  getAllThresholds,

  // 根据ID获取阈值配置
  getThresholdById,

  // 根据飞行器ID获取阈值配置
  getThresholdByAircraftId,

  // 获取默认阈值配置
  getDefaultThreshold,

  // 添加阈值配置
  addThreshold,

  // 更新阈值配置
  updateThreshold,

  // 删除阈值配置
  deleteThreshold
}
