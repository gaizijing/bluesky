// 航线实体管理（原代码中currentRouteEntities相关逻辑）
export const clearRouteEntities = (viewer, currentRouteEntities) => {
  if (viewer && currentRouteEntities.length > 0) {
    currentRouteEntities.forEach(entity => {
      try { viewer.entities.remove(entity) } catch (e) { }
    })
    currentRouteEntities.length = 0
  }
}

// 可根据实际航线创建逻辑补充其他函数