/**
 * 模型加载进度计算工具函数
 */

/**
 * 创建进度管理器实例
 * @param {Function} onProgressUpdate - 进度更新回调函数
 * @param {Object} options - 配置选项
 * @param {number} options.totalExpectedUpdates - 预期的总更新次数
 * @param {number} options.maxPossibleValue - 最大可能的原始进度值
 * @returns {Object} 进度管理器实例
 */
export function createProgressManager(onProgressUpdate, options = {}) {
  const { 
    totalExpectedUpdates = 20, 
    maxPossibleValue = 35 
  } = options;
  
  let maxProgress = 0;
  let currentDisplayProgress = 0;
  let progressCount = 0;
  let isCompleted = false;
  
  /**
   * 更新进度
   * @param {number} progress - 原始进度值
   * @returns {number} 计算后的显示进度（0-100）
   */
  function updateProgress(progress) {
    if (isCompleted) return 100;
    
    // 特殊情况处理：当原始值降为0且已经有较高进度时，直接标记为完成
    if (progress === 0 && currentDisplayProgress > 80) {
      currentDisplayProgress = 100;
      isCompleted = true;
    } else {
      // 跟踪原始进度的最大值
      maxProgress = Math.max(maxProgress, progress);
      progressCount++;
      
      // 基于最大进度和更新次数计算显示进度
      const maxProgressContribution = (maxProgress / maxPossibleValue) * 100;
      const updateCountContribution = (progressCount / totalExpectedUpdates) * 40;
      
      currentDisplayProgress = Math.round(maxProgressContribution * 0.6 + updateCountContribution);
      
      // 确保进度不会超过99%（留1%给完成状态）
      if (currentDisplayProgress > 99) {
        currentDisplayProgress = 99;
      }
    }
    
    // 调用回调函数更新进度
    if (onProgressUpdate) {
      onProgressUpdate(currentDisplayProgress);
    }
    
    return currentDisplayProgress;
  }
  
  /**
   * 标记加载完成
   */
  function markAsCompleted() {
    isCompleted = true;
    currentDisplayProgress = 100;
    
    if (onProgressUpdate) {
      onProgressUpdate(100);
    }
  }
  
  /**
   * 重置进度管理器
   */
  function reset() {
    maxProgress = 0;
    currentDisplayProgress = 0;
    progressCount = 0;
    isCompleted = false;
  }
  
  return {
    updateProgress,
    markAsCompleted,
    reset
  };
}