  const updateHeatmapTime = async (time) => {
    console.log('更新热力图时间:', time)

    if (!resources.value.heatMapInstance) {
      console.error('热力图实例未初始化')
      return
    }

    try {
      // 获取当前选中的区域
      const currentArea = areaStore.selectedArea
      if (!currentArea) {
        console.warn('未选中任何区域，无法获取热力图数据')
        return
      }

      
      // 检查是否有边界信息
      let boundsToUse = null
      if (currentArea.bbox && Array.isArray(currentArea.bbox) && currentArea.bbox.length >= 4) {
        boundsToUse = currentArea.bbox
        console.log('使用bounds属性:', boundsToUse)
      } else if (currentArea.coordinates && Array.isArray(currentArea.coordinates) && currentArea.coordinates.length >= 4) {
        boundsToUse = currentArea.coordinates
        console.log('使用coordinates属性:', boundsToUse)
      } else {
        console.warn('区域没有有效的边界信息，将使用默认范围')
        // 如果没有边界，使用以区域中心点为中心的默认范围
        if (currentArea.longitude && currentArea.latitude) {
          boundsToUse = [
            currentArea.longitude - 0.01,
            currentArea.latitude - 0.01,
            currentArea.longitude + 0.01,
            currentArea.latitude + 0.01
          ]
          console.log('使用默认边界:', boundsToUse)
        } else {
          console.error('区域没有经纬度信息，无法生成热力图')
          return
        }
      }

      // 调用后端API获取基于气象数据和阈值配置的风险热力图
      const { getWeatherForecastHeatmap } = await import('@/api')
      
      console.log('调用API参数:', {
        currentPoint: currentArea,
        timestamp: time,
        timeRange: '3h',
        resolution: 'medium',
        forRouteAnalysis: false
      })
      
      const heatmapData = await getWeatherForecastHeatmap({
        currentPoint: currentArea,
        timestamp: time,
        timeRange: '3h', // 固定3小时范围
        resolution: 'medium',
        forRouteAnalysis: false
      })
      
      console.log('API返回数据:', heatmapData)
      
      if (!heatmapData || !heatmapData.data) {
        console.error('获取热力图数据失败')
        return
      }

      // 转换后端数据为Cesium热力图需要的格式
      const convertedData = convertHeatmapDataForCesium(heatmapData.data, currentArea)
      console.log('转换后的原始数据数量:', convertedData.length)
      console.log('原始数据示例:', convertedData.slice(0, 3))
      
      // 转换为heatmap.js期望的格式：{lnglat: [lon, lat], value: number}
      const dataPoints = convertedData.map(point => ({
        lnglat: [point.x, point.y],
        value: point.value
      }))
      
      console.log('转换后的热力图数据:', dataPoints.slice(0, 3));
      console.log('数据点范围:', {
        minLng: Math.min(...dataPoints.map(p => p.lnglat[0])),
        maxLng: Math.max(...dataPoints.map(p => p.lnglat[0])),
        minLat: Math.min(...dataPoints.map(p => p.lnglat[1])),
        maxLat: Math.max(...dataPoints.map(p => p.lnglat[1]))
      })
      
      // 更新热力图数据
      const result = resources.value.heatMapInstance.updateData(dataPoints)
      
      // 如果updateData返回了新的实例，更新引用
      if (result) {
        resources.value.heatMapInstance = result
      }

      console.log('热力图数据更新成功，基于区域:', currentArea.name)
      console.log('区域边界:', boundsToUse)
      
    } catch (error) {
      console.error('更新热力图时间失败:', error)
      // 降级：使用模拟数据
      try {
        const timestamp = time.getTime()
        const { default: generateHeatmapData } = await import('@/mock/heatmapData')
        const dataPoints = generateHeatmapData(timestamp)
        const result = resources.value.heatMapInstance.updateData(dataPoints)
        if (result) {
          resources.value.heatMapInstance = result
        }
        console.warn('使用模拟数据作为降级方案')
      } catch (fallbackError) {
        console.error('降级方案也失败:', fallbackError)
      }
    }
  };